package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

type ArchitectureLayer string

const (
	LayerAPI     ArchitectureLayer = "api"
	LayerService ArchitectureLayer = "service"
	LayerData    ArchitectureLayer = "data"
	LayerConfig  ArchitectureLayer = "config"
	LayerUtil    ArchitectureLayer = "util"
	LayerTest    ArchitectureLayer = "test"
	LayerOther   ArchitectureLayer = "other"
)

type Symbol struct {
	Name       string `json:"name"`
	Kind       string `json:"kind"`
	Signature  string `json:"signature"`
	IsExported bool   `json:"isExported"`
}

type FileAnalysis struct {
	Path            string            `json:"path"`
	Extension       string            `json:"extension"`
	Layer           ArchitectureLayer `json:"layer"`
	LineCount       int               `json:"lineCount"`
	ByteSize        int64             `json:"byteSize"`
	EstimatedTokens int               `json:"estimatedTokens"`
	Symbols         []Symbol          `json:"symbols"`
	Dependencies    []string          `json:"dependencies"`
	Description     string            `json:"description,omitempty"`
}

type FocusMatch struct {
	File         FileAnalysis `json:"file"`
	Score        int          `json:"score"`
	MatchedTerms []string     `json:"matchedTerms"`
	Reasons      []string     `json:"reasons"`
}

type AtlasMap struct {
	RootDir          string                       `json:"rootDir"`
	GeneratedAt      string                       `json:"generatedAt"`
	TotalFiles       int                          `json:"totalFiles"`
	TotalLines       int                          `json:"totalLines"`
	OriginalTokens   int                          `json:"originalTokens"`
	MapTokens        int                          `json:"mapTokens"`
	CompressionRatio float64                      `json:"compressionRatio"`
	PrimaryLanguage  string                       `json:"primaryLanguage"`
	Layers           map[ArchitectureLayer][]FileAnalysis `json:"layers"`
	AllFiles         []FileAnalysis               `json:"allFiles"`
}

var defaultIgnores = map[string]bool{
	".git":              true,
	".svn":              true,
	".hg":               true,
	"node_modules":      true,
	"dist":              true,
	"build":             true,
	"out":               true,
	"target":            true,
	".gradle":           true,
	".idea":             true,
	".vscode":           true,
	"coverage":          true,
	".next":             true,
	".nuxt":             true,
	".turbo":            true,
	".cache":            true,
	"vendor":            true,
	"package-lock.json": true,
	"yarn.lock":         true,
	"pnpm-lock.yaml":    true,
}

var codeExtensions = map[string]bool{
	".ts": true, ".tsx": true, ".js": true, ".jsx": true, ".mjs": true, ".cjs": true,
	".go": true,
	".py": true, ".pyw": true,
	".java": true,
	".rs": true,
	".rb": true,
	".php": true,
	".cs": true,
	".c": true, ".cpp": true, ".cc": true, ".cxx": true, ".h": true, ".hpp": true,
	".swift": true, ".kt": true, ".kts": true,
	".scala": true,
	".sql": true,
	".sh": true, ".bash": true, ".zsh": true,
	".json": true, ".yaml": true, ".yml": true, ".toml": true,
}

func main() {
	var (
		outputPath  = flag.String("o", "AGENT_MAP.md", "Output file path")
		focusQuery  = flag.String("f", "", "Task query to pinpoint relevant target files")
		compact     = flag.Bool("c", false, "Render files in compact high-density format")
		diagram     = flag.Bool("d", false, "Include Mermaid architectural diagram in map")
		budget      = flag.Int("b", 0, "Cap output to maximum estimated token budget")
		stdout      = flag.Bool("stdout", false, "Print map to stdout instead of writing to file")
		jsonOutput  = flag.Bool("json", false, "Output in JSON format")
		maxFiles    = flag.Int("max-files", 1500, "Maximum files to scan")
	)

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "🧭 Code Atlas CLI (Standalone Native Binary)\n\n")
		fmt.Fprintf(os.Stderr, "Usage: code-atlas [options] [directory]\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
	}

	flag.Parse()

	targetDir := "."
	if flag.NArg() > 0 {
		targetDir = flag.Arg(0)
	}

	absDir, err := filepath.Abs(targetDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error resolving path: %v\n", err)
		os.Exit(1)
	}

	if !*stdout {
		fmt.Printf("\n\033[1;36m🧭 Code Atlas (Go Native)\033[0m \033[90mv0.1.0 — Generating architectural map for AI agents...\033[0m\n\n")
	}

	startTime := time.Now()
	files, err := scanRepository(absDir, *maxFiles)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error scanning repository: %v\n", err)
		os.Exit(1)
	}

	layers := map[ArchitectureLayer][]FileAnalysis{
		LayerAPI:     {},
		LayerService: {},
		LayerData:    {},
		LayerConfig:  {},
		LayerUtil:    {},
		LayerTest:    {},
		LayerOther:   {},
	}

	var allFiles []FileAnalysis
	var totalLines int
	var totalBytes int64
	langCounts := make(map[string]int)

	for _, relPath := range files {
		fullPath := filepath.Join(absDir, relPath)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}

		lines := bytes.Count(content, []byte{'\n'}) + 1
		bSize := int64(len(content))
		ext := strings.ToLower(filepath.Ext(relPath))

		langCounts[ext]++
		totalLines += lines
		totalBytes += bSize

		symbols, deps, desc := parseFileContent(relPath, content)
		layer := classifyLayer(relPath)
		tokens := int(bSize / 4)

		analysis := FileAnalysis{
			Path:            relPath,
			Extension:       ext,
			Layer:           layer,
			LineCount:       lines,
			ByteSize:        bSize,
			EstimatedTokens: tokens,
			Symbols:         symbols,
			Dependencies:    deps,
			Description:     desc,
		}

		layers[layer] = append(layers[layer], analysis)
		allFiles = append(allFiles, analysis)
	}

	primaryLang := detectPrimaryLang(langCounts)
	origTokens := int(totalBytes / 4)

	var focusMatches []FocusMatch
	if *focusQuery != "" {
		focusMatches = filterByFocus(allFiles, *focusQuery, 7)
	}

	atlas := &AtlasMap{
		RootDir:          absDir,
		GeneratedAt:      time.Now().Format("2006-01-02 15:04:05"),
		TotalFiles:       len(allFiles),
		TotalLines:       totalLines,
		OriginalTokens:   origTokens,
		PrimaryLanguage:  primaryLang,
		Layers:           layers,
		AllFiles:         allFiles,
	}

	var formattedOutput string
	if *jsonOutput {
		formattedOutput = formatJSON(atlas, focusMatches)
	} else {
		// Calculate token estimation and output
		formattedOutput = formatMarkdown(atlas, focusMatches, *focusQuery, *compact, *diagram, *budget)
	}

	mapTokens := len(formattedOutput) / 4
	compRatio := 0.0
	if origTokens > 0 {
		compRatio = 1.0 - (float64(mapTokens) / float64(origTokens))
		if compRatio < 0 {
			compRatio = 0
		}
	}
	atlas.MapTokens = mapTokens
	atlas.CompressionRatio = compRatio

	// Re-render to ensure final header has exact tokens
	if !*jsonOutput {
		formattedOutput = formatMarkdown(atlas, focusMatches, *focusQuery, *compact, *diagram, *budget)
	}

	if *stdout {
		fmt.Print(formattedOutput)
		return
	}

	targetOut := *outputPath
	if !filepath.IsAbs(targetOut) {
		targetOut = filepath.Join(absDir, targetOut)
	}

	os.MkdirAll(filepath.Dir(targetOut), 0755)
	if err := os.WriteFile(targetOut, []byte(formattedOutput), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error saving output: %v\n", err)
		os.Exit(1)
	}

	elapsed := time.Since(startTime)

	fmt.Printf("\033[32m✔\033[0m \033[1mMap generated successfully!\033[0m \033[90min %v\033[0m\n\n", elapsed)
	fmt.Printf("\033[1m📊 Compression Metrics:\033[0m\n")
	fmt.Printf("  ├─ Files Scanned:       \033[1m%d\033[0m \033[90m(%s lines)\033[0m\n", atlas.TotalFiles, formatNumber(atlas.TotalLines))
	fmt.Printf("  ├─ Original Codebase:   \033[33m~%s tokens\033[0m\n", formatNumber(atlas.OriginalTokens))
	fmt.Printf("  ├─ Atlas Map Size:      \033[1;32m~%s tokens\033[0m\n", formatNumber(atlas.MapTokens))
	fmt.Printf("  ├─ Token Reduction:     \033[1;36m%.1f%% saved\033[0m\n", atlas.CompressionRatio*100)
	fmt.Printf("  └─ Primary Stack:       \033[35m%s\033[0m\n", atlas.PrimaryLanguage)

	if len(focusMatches) > 0 {
		fmt.Printf("\n\033[1;33m🎯 Task Focus Targets:\033[0m \033[90m(Query: %q)\033[0m\n", *focusQuery)
		for _, m := range focusMatches {
			fmt.Printf("  • \033[1;36m%s\033[0m \033[90m(relevance: %d)\033[0m\n", m.File.Path, m.Score)
		}
	}

	fmt.Printf("\n\033[90m📍 Saved to: \033[4;37m%s\033[0m\n", targetOut)
	fmt.Printf("\033[90m💡 Tip: Mention AGENT_MAP.md in your prompt or add to .cursorrules for instant agent orientation!\033[0m\n\n")
}

func scanRepository(rootDir string, maxFiles int) ([]string, error) {
	var collected []string

	gitignoreRules := readGitignore(rootDir)

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if len(collected) >= maxFiles {
			return filepath.SkipDir
		}

		rel, err := filepath.Rel(rootDir, path)
		if err != nil || rel == "." {
			return nil
		}

		rel = filepath.ToSlash(rel)
		base := info.Name()

		// Ignore default dirs and files
		if defaultIgnores[base] {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if info.IsDir() {
			if strings.HasPrefix(base, ".") && base != ".github" && base != "." {
				return filepath.SkipDir
			}
			for _, rule := range gitignoreRules {
				if matchPattern(rule, rel+"/") {
					return filepath.SkipDir
				}
			}
			return nil
		}

		// Check gitignore for files
		for _, rule := range gitignoreRules {
			if matchPattern(rule, rel) {
				return nil
			}
		}

		ext := strings.ToLower(filepath.Ext(base))
		if codeExtensions[ext] {
			collected = append(collected, rel)
		}

		return nil
	})

	sort.Strings(collected)
	return collected, err
}

func readGitignore(root string) []string {
	var rules []string
	f, err := os.Open(filepath.Join(root, ".gitignore"))
	if err != nil {
		return rules
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" && !strings.HasPrefix(line, "#") {
			rules = append(rules, filepath.ToSlash(line))
		}
	}
	return rules
}

func matchPattern(pattern, path string) bool {
	pattern = strings.TrimPrefix(pattern, "/")
	pattern = strings.TrimSuffix(pattern, "/")
	if strings.Contains(path, pattern) {
		return true
	}
	matched, _ := filepath.Match(pattern, filepath.Base(path))
	return matched
}

func classifyLayer(relPath string) ArchitectureLayer {
	p := "/" + strings.ToLower(relPath)
	base := filepath.Base(p)

	// Test
	if strings.Contains(p, "/test/") || strings.Contains(p, "/tests/") || strings.Contains(p, "/spec/") ||
		strings.Contains(base, ".test.") || strings.Contains(base, ".spec.") ||
		strings.HasSuffix(base, "_test.go") || strings.HasSuffix(base, "test.java") {
		return LayerTest
	}

	// API
	if strings.Contains(p, "/controller/") || strings.Contains(p, "/controllers/") ||
		strings.Contains(p, "/routes/") || strings.Contains(p, "/route/") ||
		strings.Contains(p, "/handlers/") || strings.Contains(p, "/handler/") ||
		strings.Contains(p, "/endpoints/") || strings.Contains(p, "/endpoint/") ||
		strings.Contains(p, "/api/") || strings.Contains(p, "/cli") || strings.Contains(p, "/resolvers/") || strings.Contains(p, "/resolver/") ||
		strings.Contains(base, "controller.") || strings.Contains(base, "resolver.") ||
		base == "main.go" || base == "main.py" || base == "main.ts" || base == "cli.ts" || base == "cli.js" || base == "index.ts" || base == "index.js" {
		return LayerAPI
	}

	// Service
	if strings.Contains(p, "/service/") || strings.Contains(p, "/services/") ||
		strings.Contains(p, "/usecases/") || strings.Contains(p, "/domain/") ||
		strings.Contains(p, "/managers/") || strings.Contains(p, "/processors/") ||
		strings.Contains(base, "service.") || strings.Contains(base, "usecase.") {
		return LayerService
	}

	// Data
	if strings.Contains(p, "/model/") || strings.Contains(p, "/models/") ||
		strings.Contains(p, "/entity/") || strings.Contains(p, "/entities/") ||
		strings.Contains(p, "/repository/") || strings.Contains(p, "/repositories/") ||
		strings.Contains(p, "/schemas/") || strings.Contains(p, "/schema/") ||
		strings.Contains(p, "/migrations/") || strings.Contains(p, "/dto/") ||
		strings.Contains(base, "model.") || strings.Contains(base, "schema.") ||
		strings.Contains(base, "entity.") || base == "types.ts" || base == "schema.prisma" {
		return LayerData
	}

	// Config
	if strings.Contains(p, "/config/") || strings.Contains(p, "/configs/") ||
		strings.Contains(p, "/middleware/") || strings.Contains(p, "/middlewares/") ||
		strings.Contains(p, "/security/") || strings.Contains(p, "/infra/") ||
		strings.Contains(base, "config.") || strings.Contains(base, "setup.") ||
		strings.Contains(base, "middleware.") || strings.HasSuffix(base, ".env") {
		return LayerConfig
	}

	// Util
	if strings.Contains(p, "/util/") || strings.Contains(p, "/utils/") ||
		strings.Contains(p, "/helpers/") || strings.Contains(p, "/lib/") ||
		strings.Contains(p, "/common/") || strings.Contains(p, "/shared/") ||
		strings.Contains(p, "/exceptions/") || strings.Contains(p, "/exception/") ||
		strings.Contains(base, "util.") || strings.Contains(base, "helper.") {
		return LayerUtil
	}

	return LayerOther
}

// Regex AST parser for Go, TS, JS, Python, Java
var (
	reGoStruct    = regexp.MustCompile(`(?m)^type\s+([A-Za-z0-9_]+)\s+(struct|interface)`)
	reGoMethod    = regexp.MustCompile(`(?m)^func\s+\((?:[^)]+)\)\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$`)
	reGoFunc      = regexp.MustCompile(`(?m)^func\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.*))?$`)
	reGoSingleImp = regexp.MustCompile(`(?m)^import\s+(?:[A-Za-z0-9_.]+\s+)?["']([^"']+)["']`)
	reGoMultiImp  = regexp.MustCompile(`(?s)import\s*\((.*?)\)`)
	reStringLit   = regexp.MustCompile(`["']([^"']+)["']`)

	reTsFunc      = regexp.MustCompile(`(?m)^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*:\s*([^;{]+))?`)
	reTsClass     = regexp.MustCompile(`(?m)^(?:export\s+)?class\s+([A-Za-z0-9_]+)`)
	reTsInterface = regexp.MustCompile(`(?m)^(?:export\s+)?interface\s+([A-Za-z0-9_]+)`)
	reTsType      = regexp.MustCompile(`(?m)^(?:export\s+)?type\s+([A-Za-z0-9_]+)`)
	reTsImport    = regexp.MustCompile(`(?m)from\s+['"]([^'"]+)['"]`)
	reCjsRequire  = regexp.MustCompile(`require\(['"]([^'"]+)['"]\)`)
	reCjsExports  = regexp.MustCompile(`(?m)(?:module\.)?exports(?:\.([A-Za-z0-9_]+)|\s*=\s*\{([^}]+)\})`)

	rePyClass     = regexp.MustCompile(`(?m)^class\s+([A-Za-z0-9_]+)(?:\((.*?)\))?:`)
	rePyFunc      = regexp.MustCompile(`(?m)^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*->\s*([^:]+))?:`)
	rePyImport    = regexp.MustCompile(`(?m)^(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))`)

	reJavaClass   = regexp.MustCompile(`(?m)(?:public|protected)?\s*(?:final|abstract|sealed)?\s*(class|record|interface|enum)\s+([A-Za-z0-9_]+)`)
	reJavaMethod  = regexp.MustCompile(`(?m)(?:public|protected)\s+(?:static\s+)?(?:final\s+)?([A-Za-z0-9_<>[\], ]+)\s+([A-Za-z0-9_]+)\s*\((.*?)\)`)
	reJavaImport  = regexp.MustCompile(`(?m)^import\s+(?:static\s+)?([A-Za-z0-9_.*]+);`)
)

func parseGoImports(str string) []string {
	var imports []string
	for _, m := range reGoSingleImp.FindAllStringSubmatch(str, -1) {
		imports = append(imports, m[1])
	}
	for _, block := range reGoMultiImp.FindAllStringSubmatch(str, -1) {
		for _, m := range reStringLit.FindAllStringSubmatch(block[1], -1) {
			imports = append(imports, m[1])
		}
	}
	return imports
}

func parseFileContent(relPath string, content []byte) ([]Symbol, []string, string) {
	var symbols []Symbol
	depSet := make(map[string]bool)
	str := string(content)
	ext := strings.ToLower(filepath.Ext(relPath))

	switch ext {
	case ".go":
		// Go Structs & Interfaces
		for _, m := range reGoStruct.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{
				Name:       m[1],
				Kind:       m[2],
				Signature:  fmt.Sprintf("type %s %s", m[1], m[2]),
				IsExported: isUpper(m[1]),
			})
		}
		// Go Methods
		for _, m := range reGoMethod.FindAllStringSubmatch(str, -1) {
			ret := cleanRet(m[3])
			symbols = append(symbols, Symbol{
				Name:       m[1],
				Kind:       "method",
				Signature:  fmt.Sprintf("func %s(%s)%s", m[1], cleanParams(m[2]), ret),
				IsExported: isUpper(m[1]),
			})
		}
		// Go Functions
		for _, m := range reGoFunc.FindAllStringSubmatch(str, -1) {
			ret := cleanRet(m[3])
			symbols = append(symbols, Symbol{
				Name:       m[1],
				Kind:       "function",
				Signature:  fmt.Sprintf("func %s(%s)%s", m[1], cleanParams(m[2]), ret),
				IsExported: isUpper(m[1]),
			})
		}
		// Go Imports
		for _, imp := range parseGoImports(str) {
			depSet[imp] = true
		}

	case ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs":
		// TS/JS Classes
		for _, m := range reTsClass.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{Name: m[1], Kind: "class", Signature: "class " + m[1], IsExported: true})
		}
		// Interfaces & Types
		for _, m := range reTsInterface.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{Name: m[1], Kind: "interface", Signature: "interface " + m[1], IsExported: true})
		}
		for _, m := range reTsType.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{Name: m[1], Kind: "type", Signature: "type " + m[1], IsExported: true})
		}
		// Functions
		for _, m := range reTsFunc.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{
				Name:       m[1],
				Kind:       "function",
				Signature:  fmt.Sprintf("%s(%s)", m[1], cleanParams(m[2])),
				IsExported: true,
			})
		}
		// CommonJS exports
		for _, m := range reCjsExports.FindAllStringSubmatch(str, -1) {
			if m[1] != "" {
				symbols = append(symbols, Symbol{Name: m[1], Kind: "function", Signature: m[1] + "()", IsExported: true})
			} else if m[2] != "" {
				for _, part := range strings.Split(m[2], ",") {
					sym := strings.TrimSpace(part)
					if sym != "" && !strings.Contains(sym, "\n") {
						symbols = append(symbols, Symbol{Name: sym, Kind: "function", Signature: sym + "()", IsExported: true})
					}
				}
			}
		}
		// Imports
		for _, m := range reTsImport.FindAllStringSubmatch(str, -1) {
			depSet[m[1]] = true
		}
		for _, m := range reCjsRequire.FindAllStringSubmatch(str, -1) {
			depSet[m[1]] = true
		}

	case ".py", ".pyw":
		for _, m := range rePyClass.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{Name: m[1], Kind: "class", Signature: "class " + m[1], IsExported: !strings.HasPrefix(m[1], "_")})
		}
		for _, m := range rePyFunc.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{
				Name:       m[1],
				Kind:       "function",
				Signature:  fmt.Sprintf("def %s(%s)", m[1], cleanParams(m[2])),
				IsExported: !strings.HasPrefix(m[1], "_"),
			})
		}
		for _, m := range rePyImport.FindAllStringSubmatch(str, -1) {
			dep := m[1]
			if dep == "" {
				dep = m[2]
			}
			depSet[dep] = true
		}

	case ".java":
		for _, m := range reJavaClass.FindAllStringSubmatch(str, -1) {
			symbols = append(symbols, Symbol{Name: m[2], Kind: m[1], Signature: fmt.Sprintf("%s %s", m[1], m[2]), IsExported: true})
		}
		for _, m := range reJavaMethod.FindAllStringSubmatch(str, -1) {
			name := m[2]
			if name != "if" && name != "for" && name != "while" {
				symbols = append(symbols, Symbol{
					Name:       name,
					Kind:       "method",
					Signature:  fmt.Sprintf("%s(%s): %s", name, cleanParams(m[3]), strings.TrimSpace(m[1])),
					IsExported: true,
				})
			}
		}
		for _, m := range reJavaImport.FindAllStringSubmatch(str, -1) {
			depSet[m[1]] = true
		}
	}

	var deps []string
	for d := range depSet {
		deps = append(deps, d)
	}
	sort.Strings(deps)

	return symbols, deps, ""
}

func filterByFocus(files []FileAnalysis, query string, topN int) []FocusMatch {
	if strings.TrimSpace(query) == "" {
		return nil
	}

	terms := strings.FieldsFunc(strings.ToLower(query), func(r rune) bool {
		return r == ' ' || r == ',' || r == '.' || r == '_' || r == '-' || r == '/'
	})

	var matches []FocusMatch

	for _, f := range files {
		score := 0
		var reasons []string
		termSet := make(map[string]bool)
		lowerPath := strings.ToLower(f.Path)

		for _, t := range terms {
			if len(t) < 2 {
				continue
			}
			if strings.Contains(lowerPath, t) {
				score += 15
				termSet[t] = true
				reasons = append(reasons, fmt.Sprintf("Path contains %q", t))
			}
			for _, s := range f.Symbols {
				if strings.Contains(strings.ToLower(s.Name+" "+s.Signature), t) {
					score += 10
					termSet[t] = true
					reasons = append(reasons, fmt.Sprintf("Symbol `%s` matches %q", s.Name, t))
				}
			}
		}

		if score > 0 {
			if f.Layer == LayerService {
				score += 5
			} else if f.Layer == LayerAPI {
				score += 4
			} else if f.Layer == LayerTest {
				score -= 3
			}

			var matchedTerms []string
			for t := range termSet {
				matchedTerms = append(matchedTerms, t)
			}

			matches = append(matches, FocusMatch{
				File:         f,
				Score:        score,
				MatchedTerms: matchedTerms,
				Reasons:      uniqueStrings(reasons),
			})
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].Score > matches[j].Score
	})

	if len(matches) > topN {
		matches = matches[:topN]
	}

	return matches
}

func formatMarkdown(atlas *AtlasMap, matches []FocusMatch, focusQuery string, compact bool, diagram bool, budget int) string {
	var b strings.Builder

	b.WriteString("# 🧭 Code Atlas: Architectural Map for AI Agents\n\n")
	b.WriteString(fmt.Sprintf("> 📊 **Original Codebase:** ~%s tokens (%d files, %s lines)\n", formatNumber(atlas.OriginalTokens), atlas.TotalFiles, formatNumber(atlas.TotalLines)))
	b.WriteString(fmt.Sprintf("> ⚡ **Atlas Map:** ~%s tokens (**%.1f%% token reduction**)\n", formatNumber(atlas.MapTokens), atlas.CompressionRatio*100))
	b.WriteString(fmt.Sprintf("> 🏷️ **Primary Stack:** %s\n", atlas.PrimaryLanguage))
	b.WriteString(fmt.Sprintf("> 🕒 **Generated:** %s\n", atlas.GeneratedAt))

	if compact {
		b.WriteString("> ⚡ *Mode: Compact High-Density*\n")
	}
	if budget > 0 {
		b.WriteString(fmt.Sprintf("> 🎯 *Budget Cap: ~%s tokens*\n", formatNumber(budget)))
	}
	b.WriteString("\n")

	// Mermaid diagram
	if diagram {
		b.WriteString("---\n\n## 📊 Architecture Flowchart\n\n```mermaid\ngraph TD\n")
		b.WriteString(fmt.Sprintf("  API[\"🌐 API & Entrypoints (%d)\"]\n", len(atlas.Layers[LayerAPI])))
		b.WriteString(fmt.Sprintf("  Service[\"⚙️ Services & Logic (%d)\"]\n", len(atlas.Layers[LayerService])))
		b.WriteString(fmt.Sprintf("  Data[\"💾 Models & Data (%d)\"]\n", len(atlas.Layers[LayerData])))
		b.WriteString(fmt.Sprintf("  Config[\"🔧 Config & Setup (%d)\"]\n", len(atlas.Layers[LayerConfig])))
		b.WriteString(fmt.Sprintf("  Util[\"🧰 Utilities (%d)\"]\n\n", len(atlas.Layers[LayerUtil])))
		b.WriteString("  API --> Service\n  Service --> Data\n  API -.-> Config\n  Service -.-> Util\n```\n\n")
	}

	// Focus targets
	if len(matches) > 0 && focusQuery != "" {
		b.WriteString("---\n\n")
		b.WriteString(fmt.Sprintf("## 🎯 Task Focus Targets (Query: %q)\n", focusQuery))
		b.WriteString("> The AI Agent should prioritize inspecting and editing these target files first:\n\n")

		for _, m := range matches {
			b.WriteString(fmt.Sprintf("### `%s` (Score: %d, %d lines)\n", m.File.Path, m.Score, m.File.LineCount))
			if len(m.Reasons) > 0 {
				b.WriteString(fmt.Sprintf("- 💡 *Relevance:* %s\n", strings.Join(m.Reasons, "; ")))
			}
			if len(m.File.Symbols) > 0 {
				b.WriteString("- *Key Symbols:*\n")
				limit := 6
				if len(m.File.Symbols) < limit {
					limit = len(m.File.Symbols)
				}
				for _, s := range m.File.Symbols[:limit] {
					b.WriteString(fmt.Sprintf("  - `%s`\n", s.Signature))
				}
			}
			if len(m.File.Dependencies) > 0 {
				limit := 5
				if len(m.File.Dependencies) < limit {
					limit = len(m.File.Dependencies)
				}
				b.WriteString(fmt.Sprintf("- 🔗 *Dependencies:* `%s`\n", strings.Join(m.File.Dependencies[:limit], "`, `")))
			}
			b.WriteString("\n")
		}
	}

	b.WriteString("---\n\n## 🗺️ Architectural Layer Map\n\n")

	layersOrder := []struct {
		layer ArchitectureLayer
		title string
		icon  string
	}{
		{LayerAPI, "API & Entrypoints", "🌐"},
		{LayerService, "Business Logic & Services", "⚙️"},
		{LayerData, "Data, Models & Schemas", "💾"},
		{LayerConfig, "Configuration & Middlewares", "🔧"},
		{LayerUtil, "Utilities & Helpers", "🧰"},
		{LayerTest, "Test Suites", "🧪"},
		{LayerOther, "Miscellaneous Modules", "📁"},
	}

	budgetReached := false
	currentTokens := len(b.String()) / 4

	for _, item := range layersOrder {
		files := atlas.Layers[item.layer]
		if len(files) == 0 {
			continue
		}

		b.WriteString(fmt.Sprintf("### %s %s (%d files)\n\n", item.icon, item.title, len(files)))

		for i, f := range files {
			if budget > 0 && currentTokens >= budget {
				b.WriteString(fmt.Sprintf("- ... *(+%d more files in this layer omitted to respect token budget)*\n", len(files)-i))
				budgetReached = true
				break
			}

			line := renderFile(f, compact)
			b.WriteString(line + "\n")
			currentTokens += len(line) / 4
		}
		b.WriteString("\n")

		if budget > 0 && budgetReached && item.layer == LayerOther {
			break
		}
	}

	if budgetReached {
		b.WriteString("> ⚠️ *Note: Some modules were truncated to stay within the specified token budget.*\n\n")
	}

	return b.String()
}

func renderFile(f FileAnalysis, compact bool) string {
	if compact {
		var syms []string
		limit := 3
		if len(f.Symbols) < limit {
			limit = len(f.Symbols)
		}
		for _, s := range f.Symbols[:limit] {
			syms = append(syms, fmt.Sprintf("`%s`", s.Signature))
		}
		res := fmt.Sprintf("- **`%s`** (%dL)", f.Path, f.LineCount)
		if len(syms) > 0 {
			extra := ""
			if len(f.Symbols) > 3 {
				extra = fmt.Sprintf(" (+%d)", len(f.Symbols)-3)
			}
			res += fmt.Sprintf(" — 🧩 *Exports:* %s%s", strings.Join(syms, ", "), extra)
		}
		if len(f.Dependencies) > 0 {
			dLimit := 3
			if len(f.Dependencies) < dLimit {
				dLimit = len(f.Dependencies)
			}
			extra := ""
			if len(f.Dependencies) > 3 {
				extra = fmt.Sprintf(" (+%d)", len(f.Dependencies)-3)
			}
			res += fmt.Sprintf(" — 🔗 *Uses:* `%s`%s", strings.Join(f.Dependencies[:dLimit], ", "), extra)
		}
		return res
	}

	var parts []string
	parts = append(parts, fmt.Sprintf("- **`%s`** (%d lines)", f.Path, f.LineCount))

	if len(f.Symbols) > 0 {
		var syms []string
		limit := 5
		if len(f.Symbols) < limit {
			limit = len(f.Symbols)
		}
		for _, s := range f.Symbols[:limit] {
			syms = append(syms, fmt.Sprintf("`%s`", s.Signature))
		}
		extra := ""
		if len(f.Symbols) > 5 {
			extra = fmt.Sprintf(" *(+%d more)*", len(f.Symbols)-5)
		}
		parts = append(parts, fmt.Sprintf("  - 🧩 *Exports:* %s%s", strings.Join(syms, ", "), extra))
	}

	if len(f.Dependencies) > 0 {
		limit := 4
		if len(f.Dependencies) < limit {
			limit = len(f.Dependencies)
		}
		extra := ""
		if len(f.Dependencies) > 4 {
			extra = fmt.Sprintf(" (+%d)", len(f.Dependencies)-4)
		}
		parts = append(parts, fmt.Sprintf("  - 🔗 *Uses:* `%s`%s", strings.Join(f.Dependencies[:limit], ", "), extra))
	}

	return strings.Join(parts, "\n")
}

func formatJSON(atlas *AtlasMap, matches []FocusMatch) string {
	data := map[string]interface{}{
		"meta": map[string]interface{}{
			"totalFiles: ":     atlas.TotalFiles,
			"totalLines":       atlas.TotalLines,
			"originalTokens":   atlas.OriginalTokens,
			"mapTokens":        atlas.MapTokens,
			"compressionRatio": atlas.CompressionRatio,
			"primaryLanguage":  atlas.PrimaryLanguage,
			"generatedAt":      atlas.GeneratedAt,
		},
		"focusTargets": matches,
		"layers":       atlas.Layers,
	}
	bytes, _ := json.MarshalIndent(data, "", "  ")
	return string(bytes)
}

func detectPrimaryLang(counts map[string]int) string {
	max := 0
	top := "TypeScript / JavaScript"
	for ext, count := range counts {
		if count > max {
			max = count
			switch ext {
			case ".go":
				top = "Go"
			case ".py":
				top = "Python"
			case ".java":
				top = "Java"
			case ".rs":
				top = "Rust"
			case ".ts", ".tsx":
				top = "TypeScript"
			case ".js", ".jsx":
				top = "JavaScript"
			}
		}
	}
	return top
}

func isUpper(s string) bool {
	if len(s) == 0 {
		return false
	}
	return s[0] >= 'A' && s[0] <= 'Z'
}

func cleanRet(r string) string {
	r = strings.TrimSpace(r)
	if idx := strings.Index(r, "{"); idx != -1 {
		r = strings.TrimSpace(r[:idx])
	}
	if r != "" {
		return " " + r
	}
	return ""
}

func cleanParams(p string) string {
	return strings.Join(strings.Fields(p), " ")
}

func uniqueStrings(slice []string) []string {
	seen := make(map[string]bool)
	var res []string
	for _, s := range slice {
		if !seen[s] {
			seen[s] = true
			res = append(res, s)
		}
	}
	return res
}

func formatNumber(n int) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var res []string
	for len(s) > 3 {
		res = append([]string{s[len(s)-3:]}, res...)
		s = s[:len(s)-3]
	}
	res = append([]string{s}, res...)
	return strings.Join(res, ",")
}
