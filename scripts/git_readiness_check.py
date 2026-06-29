#!/usr/bin/env python3
"""
Git Readiness Check
Verifies the repository is safe to commit:
- No .env files
- No database files
- No sensitive data
- No API keys or credentials
- .gitignore is properly configured
"""

import os
import re
from pathlib import Path

def check_file_contents(filepath, patterns):
    """Check if file contains sensitive patterns."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            for pattern_name, pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    return pattern_name
    except:
        pass
    return None

def main():
    """Run all git readiness checks."""
    print("\n" + "="*60)
    print("GIT READINESS CHECK")
    print("="*60)
    
    issues = []
    warnings = []
    
    # Initialize paths
    gitignore_path = Path('.gitignore')
    backend_gitignore_path = Path('backend/.gitignore')
    
    # Check 1: .env files should not exist or be in .gitignore
    print("\n[1/5] Checking for .env files...")
    env_files = list(Path('.').rglob('.env'))
    if env_files:
        # Check if .env is in .gitignore
        if gitignore_path.exists():
            with open(gitignore_path) as f:
                gitignore_content = f.read()
            if '.env' in gitignore_content:
                print(f"  [OK] Found {len(env_files)} .env file(s) (properly git-ignored)")
            else:
                warnings.append(f"Found .env files but not in .gitignore")
                for f in env_files:
                    print(f"  [WARN] {f}")
        else:
            warnings.append(f"Found {len(env_files)} .env file(s) - ensure they're in .gitignore")
            for f in env_files:
                print(f"  [WARN] {f}")
    else:
        print("  [OK] No .env files found in repository")
    
    # Check 2: Database files should not exist or be in .gitignore
    print("\n[2/5] Checking for database files...")
    db_files = list(Path('.').rglob('*.db')) + list(Path('.').rglob('*.sqlite'))
    if db_files:
        # Check if *.db is in .gitignore
        if gitignore_path.exists():
            with open(gitignore_path) as f:
                gitignore_content = f.read()
            if '*.db' in gitignore_content or '*.sqlite' in gitignore_content:
                print(f"  [OK] Found {len(db_files)} database file(s) (properly git-ignored)")
            else:
                issues.append(f"Found {len(db_files)} database file(s)")
                for f in db_files:
                    print(f"  [FAIL] {f}")
        else:
            issues.append(f"Found {len(db_files)} database file(s)")
            for f in db_files:
                print(f"  [FAIL] {f}")
    else:
        print("  [OK] No database files found")
    
    # Check 3: Scan for API keys and credentials in code
    print("\n[3/5] Scanning for API keys and credentials...")
    sensitive_patterns = [
        ('AWS Access Key', r'AKIA[0-9A-Z]{16}'),
        ('Private Key', r'-----BEGIN (?:RSA|DSA|EC|PGP) PRIVATE KEY'),
        ('Password in code', r'password\s*=\s*["\']([^"\']+)["\']'),
        ('API Key in code', r'api[_-]?key\s*=\s*["\']([^"\']+)["\']'),
        ('Bearer Token', r'Bearer\s+([a-zA-Z0-9\-._~+/]+=*)'),
        ('JWT Token', r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+'),
    ]
    
    excluded_dirs = {'.git', 'node_modules', '.venv', 'venv', 'dist', '__pycache__', '.idea', '.vscode'}
    excluded_files = {'git_readiness_check.py', 'run_all_tests.py'}  # Exclude test scripts
    
    found_secrets = False
    for filepath in Path('.').rglob('*'):
        if filepath.is_file() and not any(exc in filepath.parts for exc in excluded_dirs):
            # Skip test scripts and certain file types
            if filepath.name in excluded_files or filepath.suffix in {'.db', '.sqlite', '.pyc', '.o', '.a'}:
                continue
            
            secret_type = check_file_contents(filepath, sensitive_patterns)
            if secret_type:
                print(f"  [FAIL] {filepath}: {secret_type}")
                issues.append(f"Found {secret_type} in {filepath}")
                found_secrets = True
    
    if not found_secrets:
        print("  [OK] No API keys or credentials found")
    
    # Check 4: Verify .gitignore exists and has key entries
    print("\n[4/5] Checking .gitignore configuration...")
    
    required_ignores = ['.env', '*.db', 'node_modules', '.venv', 'dist']
    
    if gitignore_path.exists():
        with open(gitignore_path) as f:
            gitignore_content = f.read()
        missing = [ig for ig in required_ignores if ig not in gitignore_content]
        if missing:
            warnings.append(f".gitignore missing: {', '.join(missing)}")
        else:
            print("  [OK] Root .gitignore configured correctly")
    else:
        issues.append(".gitignore not found")
    
    if backend_gitignore_path.exists():
        print("  [OK] Backend .gitignore exists")
    else:
        warnings.append("Backend .gitignore missing")
    
    # Check 5: Verify no data files will be committed
    print("\n[5/5] Checking for data files...")
    data_files = ['.json', '.csv']
    data_dir = Path('src/data')
    if data_dir.exists():
        json_files = list(data_dir.glob('*.json'))
        if json_files:
            print(f"  [WARN] Found {len(json_files)} JSON files in src/data/")
            for f in json_files:
                print(f"    - {f.name} (should be git-ignored)")
        else:
            print("  [OK] No data files in src/data/")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if issues:
        print(f"\n[FAIL] CRITICAL ISSUES ({len(issues)}):")
        for issue in issues:
            print(f"  * {issue}")
    
    if warnings:
        print(f"\n[WARN] WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"  * {warning}")
    
    if not issues and not warnings:
        print("\n[OK] Repository is ready to commit!")
        print("  - No sensitive files found")
        print("  - No credentials exposed")
        print("  - .gitignore properly configured")
        return 0
    elif not issues:
        print("\n[OK] Safe to commit (warnings are non-critical)")
        return 0
    else:
        print(f"\n[FAIL] NOT READY TO COMMIT - Fix {len(issues)} issue(s) above")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(main())
