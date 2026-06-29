#!/usr/bin/env python3
"""
Comprehensive test suite runner.
Runs all validation checks before committing or deploying.
"""

import subprocess
import sys
import json
import os
from pathlib import Path

def run_command(cmd, description, cwd=None):
    """Run a command and report results."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    try:
        # Convert to absolute paths
        if cwd:
            cwd = str(Path(cwd).resolve())
        
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True if sys.platform == 'win32' else False)
        
        if result.stdout:
            print(result.stdout)
        if result.stderr and 'warning' in result.stderr.lower():
            print(result.stderr, file=sys.stderr)
        
        if result.returncode == 0:
            print(f"[PASS] {description}")
            return True
        else:
            print(f"[FAIL] {description}")
            if result.stderr:
                print(f"Error: {result.stderr[:200]}")
            return False
    except Exception as e:
        print(f"[ERROR] {description}")
        print(f"  {str(e)[:200]}")
        return False

def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("BASKETBALL DASHBOARD - COMPREHENSIVE TEST SUITE")
    print("="*60)
    
    results = {}
    project_root = str(Path('.').resolve())
    
    # 1. Frontend: TypeScript Build
    results['frontend_build'] = run_command(
        f'npm run build',
        'Frontend TypeScript Build',
        cwd=project_root
    )
    
    # 2. Frontend: Lint
    results['frontend_lint'] = run_command(
        f'npm run lint',
        'Frontend ESLint',
        cwd=project_root
    )
    
    # 3. Frontend: Smoke Test (Data Validation)
    results['frontend_smoke'] = run_command(
        f'npm run smoke',
        'Frontend Data Validation',
        cwd=project_root
    )
    
    # 4. Backend: TypeScript Build
    results['backend_build'] = run_command(
        f'npm run build',
        'Backend TypeScript Build',
        cwd=f'{project_root}/backend'
    )
    
    # 5. Backend: Database Initialization
    results['backend_db_init'] = run_command(
        f'npm run init-db',
        'Backend Database Initialization',
        cwd=f'{project_root}/backend'
    )
    
    # 6. Backend: API Tests
    results['backend_api_tests'] = run_command(
        f'python scripts/test_api.py',
        'Backend API Tests (9 endpoints)',
        cwd=project_root
    )
    
    # 7. Backend: Security Tests
    results['backend_security_tests'] = run_command(
        f'python scripts/security_test.py',
        'Backend Security Audit',
        cwd=project_root
    )
    
    # 8. Data Validation: Migration Verification
    results['data_validation'] = run_command(
        f'python scripts/verify_migration.py',
        'Data Migration Verification',
        cwd=project_root
    )
    
    # 9. Git Readiness: Check for sensitive files
    results['git_readiness'] = run_command(
        f'python scripts/git_readiness_check.py',
        'Git Readiness Check',
        cwd=project_root
    )
    
    # Summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\nAll tests passed - Ready to commit!")
        return 0
    else:
        print(f"\n{total - passed} tests failed - Fix before committing")
        return 1

if __name__ == '__main__':
    sys.exit(main())
