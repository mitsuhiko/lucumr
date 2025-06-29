#!/usr/bin/env python3
"""
RST to Markdown Conversion Validation Script

This script provides a complete workflow for converting RST to Markdown
and validating that the output matches visually. It follows the workflow:

1. Backup existing built HTML
2. Convert .rst to .md files
3. Update the generator to handle .md files
4. Rebuild the site
5. Compare outputs for visual validation
"""

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from convert_rst_to_md import RSTToMarkdownConverter


class ConversionValidator:
    """Handles the complete conversion and validation workflow."""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.blog_dir = project_root / "blog"
        self.posts_dir = self.blog_dir / "posts"
        self.build_dir = self.blog_dir / "_build"
        self.backup_dir = project_root / "conversion_backup"
        self.converter = RSTToMarkdownConverter()

    def create_backup(self) -> bool:
        """Create backup of current built site."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"html_backup_{timestamp}"

            if self.build_dir.exists():
                print(f"Creating backup at {backup_path}")
                shutil.copytree(self.build_dir, backup_path)

                # Also backup the original RST files
                rst_backup_path = self.backup_dir / f"rst_backup_{timestamp}"
                print(f"Creating RST backup at {rst_backup_path}")
                shutil.copytree(self.posts_dir, rst_backup_path)

                # Save backup info
                info_file = self.backup_dir / "latest_backup.txt"
                with open(info_file, "w") as f:
                    f.write(f"{timestamp}\n")
                    f.write(f"HTML: {backup_path}\n")
                    f.write(f"RST: {rst_backup_path}\n")

                return True
            else:
                print("No existing build directory found. Skipping backup.")
                return True

        except Exception as e:
            print(f"Error creating backup: {e}")
            return False

    def convert_rst_files(self) -> Tuple[int, int]:
        """Convert all RST files to Markdown in place."""
        print("Converting RST files to Markdown...")

        converted = 0
        failed = 0

        for rst_file in self.posts_dir.rglob("*.rst"):
            md_file = rst_file.with_suffix(".md")

            print(f"Converting {rst_file.name}")

            if self.converter.convert_file(rst_file, md_file):
                # Remove original RST file after successful conversion
                rst_file.unlink()
                converted += 1
            else:
                failed += 1

        print(f"Conversion complete: {converted} files converted, {failed} failed")
        return converted, failed

    def update_generator_for_markdown(self) -> bool:
        """Update the generator to handle Markdown files."""
        print("Checking if generator needs updates for Markdown support...")

        # Check if marko is being used in the generator
        markup_file = self.project_root / "generator" / "markup.py"

        if markup_file.exists():
            with open(markup_file, "r") as f:
                content = f.read()

            # Check if it already handles markdown
            if "marko" in content or ".md" in content:
                print("Generator appears to already support Markdown")
                return True
            else:
                print("WARNING: Generator may need manual updates to support Markdown")
                print("You may need to modify generator/markup.py to handle .md files")
                return True
        else:
            print("markup.py not found, generator may need manual updates")
            return True

    def build_site(self) -> bool:
        """Build the site using the generator."""
        print("Building site...")

        try:
            # Try to run the build command
            result = subprocess.run(
                ["uv", "run", "build-blog"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode == 0:
                print("Site built successfully")
                print(result.stdout)
                return True
            else:
                print("Build failed:")
                print(result.stderr)
                return False

        except subprocess.TimeoutExpired:
            print("Build timed out after 5 minutes")
            return False
        except Exception as e:
            print(f"Error running build: {e}")
            return False

    def find_differences(self) -> List[str]:
        """Find differences between original and new builds."""
        print("Analyzing differences...")

        # Read latest backup info
        info_file = self.backup_dir / "latest_backup.txt"
        if not info_file.exists():
            return ["No backup found for comparison"]

        with open(info_file, "r") as f:
            lines = f.readlines()
            backup_html_path = None
            for line in lines:
                if line.startswith("HTML: "):
                    backup_html_path = Path(line.strip().split(": ", 1)[1])
                    break

        if not backup_html_path or not backup_html_path.exists():
            return ["Backup HTML directory not found"]

        differences = []

        # Compare file lists
        original_files = set()
        new_files = set()

        if backup_html_path.exists():
            for f in backup_html_path.rglob("*.html"):
                original_files.add(f.relative_to(backup_html_path))

        if self.build_dir.exists():
            for f in self.build_dir.rglob("*.html"):
                new_files.add(f.relative_to(self.build_dir))

        # Check for missing/new files
        missing = original_files - new_files
        new = new_files - original_files

        if missing:
            differences.append(f"Missing files: {list(missing)}")
        if new:
            differences.append(f"New files: {list(new)}")

        # Check file sizes for common files
        common_files = original_files & new_files
        size_differences = []

        for file_path in common_files:
            original_size = (backup_html_path / file_path).stat().st_size
            new_size = (self.build_dir / file_path).stat().st_size

            size_diff = abs(original_size - new_size)
            size_ratio = size_diff / max(original_size, 1)

            if size_ratio > 0.1:  # More than 10% difference
                size_differences.append(
                    f"{file_path}: {original_size} -> {new_size} bytes"
                )

        if size_differences:
            differences.append(
                f"Significant size differences: {size_differences[:10]}"
            )  # Limit output

        return differences

    def restore_from_backup(self) -> bool:
        """Restore from backup in case of issues."""
        print("Restoring from backup...")

        info_file = self.backup_dir / "latest_backup.txt"
        if not info_file.exists():
            print("No backup info found")
            return False

        with open(info_file, "r") as f:
            lines = f.readlines()
            rst_backup_path = None
            for line in lines:
                if line.startswith("RST: "):
                    rst_backup_path = Path(line.strip().split(": ", 1)[1])
                    break

        if not rst_backup_path or not rst_backup_path.exists():
            print("RST backup not found")
            return False

        try:
            # Remove current posts directory
            if self.posts_dir.exists():
                shutil.rmtree(self.posts_dir)

            # Restore from backup
            shutil.copytree(rst_backup_path, self.posts_dir)
            print("Restored from backup successfully")
            return True

        except Exception as e:
            print(f"Error restoring from backup: {e}")
            return False

    def run_full_workflow(self) -> bool:
        """Run the complete conversion and validation workflow."""
        print("=== Starting RST to Markdown Conversion Workflow ===\n")

        # Step 1: Create backup
        print("Step 1: Creating backup...")
        if not self.create_backup():
            print("ERROR: Failed to create backup")
            return False
        print("✓ Backup created\n")

        # Step 2: Convert files
        print("Step 2: Converting RST files to Markdown...")
        converted, failed = self.convert_rst_files()

        if failed > 0:
            print(f"ERROR: {failed} files failed to convert")
            print("Do you want to continue anyway? (y/n): ", end="")
            if input().lower() != "y":
                self.restore_from_backup()
                return False
        print("✓ RST files converted\n")

        # Step 3: Update generator
        print("Step 3: Checking generator compatibility...")
        self.update_generator_for_markdown()
        print("✓ Generator check complete\n")

        # Step 4: Build site
        print("Step 4: Building site...")
        if not self.build_site():
            print("ERROR: Failed to build site")
            print("Do you want to restore from backup? (y/n): ", end="")
            if input().lower() == "y":
                self.restore_from_backup()
            return False
        print("✓ Site built successfully\n")

        # Step 5: Analyze differences
        print("Step 5: Analyzing differences...")
        differences = self.find_differences()

        if differences:
            print("Differences found:")
            for diff in differences:
                print(f"  - {diff}")
        else:
            print("No significant differences detected")

        print("\n=== Conversion Workflow Complete ===")
        print(f"Converted {converted} files")
        print(f"Build directory: {self.build_dir}")
        print("Please manually review the built site for visual correctness")

        return True


def main():
    """Main entry point."""
    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        # Restore from backup
        validator = ConversionValidator(Path.cwd())
        if validator.restore_from_backup():
            print("Restored from backup successfully")
        else:
            print("Failed to restore from backup")
        return

    # Run full workflow
    validator = ConversionValidator(Path.cwd())

    print("This will convert all RST files to Markdown and validate the conversion.")
    print("A backup will be created first.")
    print()
    print("Continue? (y/n): ", end="")

    if input().lower() != "y":
        print("Aborted")
        return

    success = validator.run_full_workflow()

    if not success:
        print("\nWorkflow failed. You can restore from backup using:")
        print("python validate_conversion.py restore")
    else:
        print("\nWorkflow completed. Please review the site manually.")
        print("If issues are found, you can restore using:")
        print("python validate_conversion.py restore")


if __name__ == "__main__":
    main()
