#!/usr/bin/env python3
"""
RST to Markdown Conversion Script

This script converts reStructuredText files to Markdown using docutils AST
for lossless conversion. It preserves the frontmatter format and handles
the specific format used in this blog.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import docutils.core
import docutils.nodes
from docutils.parsers.rst import directives
from docutils.parsers.rst.directives import images


class MarkdownWriter(docutils.nodes.NodeVisitor):
    """Converts docutils AST nodes to Markdown format."""

    def __init__(self, document):
        super().__init__(document)
        self.output = []
        self.list_depth = 0
        self.in_literal = False
        self.section_level = 0
        self.footnotes = {}  # Store footnote mappings
        self.footnote_counter = 1  # For auto-numbering footnotes

    def visit_document(self, node):
        pass

    def depart_document(self, node):
        pass

    def visit_section(self, node):
        self.section_level += 1

    def depart_section(self, node):
        self.section_level -= 1

    def visit_title(self, node):
        # RST document structure: document title is level 1, sections start at level 2
        # Check if this is a document title (parent is document) or section title
        if isinstance(node.parent, docutils.nodes.document):
            level = 1  # Document title
        else:
            level = min(self.section_level + 1, 6)  # Section headers start at 2
        self.output.append("#" * level + " ")

    def depart_title(self, node):
        self.output.append("\n\n")

    def visit_paragraph(self, node):
        # If we're in a blockquote and this isn't part of a list item, prefix with >
        if getattr(self, "_in_blockquote", False) and not isinstance(
            node.parent, docutils.nodes.list_item
        ):
            self.output.append("> ")

    def depart_paragraph(self, node):
        if getattr(self, "_in_blockquote", False) and not isinstance(
            node.parent, docutils.nodes.list_item
        ):
            self.output.append("\n>\n")
        else:
            self.output.append("\n\n")

    def visit_Text(self, node):
        text = str(node)
        self.output.append(text)

    def depart_Text(self, node):
        pass

    def visit_emphasis(self, node):
        self.output.append("*")

    def depart_emphasis(self, node):
        self.output.append("*")

    def visit_strong(self, node):
        self.output.append("**")

    def depart_strong(self, node):
        self.output.append("**")

    def visit_literal(self, node):
        self.output.append("`")
        self.in_literal = True

    def depart_literal(self, node):
        self.output.append("`")
        self.in_literal = False

    def visit_title_reference(self, node):
        # RST title references (single backticks) are often used for inline code
        self.output.append("`")

    def depart_title_reference(self, node):
        self.output.append("`")

    def visit_footnote_reference(self, node):
        # Convert RST footnote references to markdown footnote syntax
        refid = node.get("refid", "")
        if refid:
            # Map RST footnote reference to a numbered footnote
            if refid not in self.footnotes:
                self.footnotes[refid] = str(self.footnote_counter)
                self.footnote_counter += 1
            self.output.append(f"[^{self.footnotes[refid]}]")
        else:
            # Fallback for unnamed references
            self.output.append("[^1]")
        raise docutils.nodes.SkipNode  # Skip children

    def depart_footnote_reference(self, node):
        pass  # Already handled in visit

    def visit_footnote(self, node):
        # Get the footnote ID
        footnote_id = node.get("ids", [""])[0] if node.get("ids") else ""
        if footnote_id and footnote_id in self.footnotes:
            footnote_num = self.footnotes[footnote_id]
        else:
            # Fallback numbering
            footnote_num = str(self.footnote_counter)
            self.footnote_counter += 1

        self.output.append(f"\n[^{footnote_num}]: ")

    def depart_footnote(self, node):
        self.output.append("\n")

    def visit_label(self, node):
        # Skip the label as we handle it in visit_footnote
        raise docutils.nodes.SkipNode

    def visit_literal_block(self, node):
        # Extract language from classes attribute (e.g., "code rust" -> "rust")
        classes = node.get("classes", [])
        language = ""

        # Look for language specification in classes
        if len(classes) >= 2 and classes[0] == "code":
            language = classes[1]
        elif "language" in node:
            language = node["language"]

        self.output.append(f"```{language}\n")

    def depart_literal_block(self, node):
        self.output.append("\n```\n\n")

    def visit_doctest_block(self, node):
        self.output.append("```\n")

    def depart_doctest_block(self, node):
        self.output.append("\n```\n\n")

    def visit_quote(self, node):
        # Handle quoted blocks (indented content)
        self.output.append("```\n")

    def depart_quote(self, node):
        self.output.append("\n```\n\n")

    def visit_code_block(self, node):
        language = node.get("language", "")
        self.output.append(f"```{language}\n")

    def depart_code_block(self, node):
        self.output.append("\n```\n\n")

    def visit_bullet_list(self, node):
        self.list_depth += 1

    def depart_bullet_list(self, node):
        self.list_depth -= 1
        if self.list_depth == 0:
            self.output.append("\n")

    def visit_enumerated_list(self, node):
        self.list_depth += 1

    def depart_enumerated_list(self, node):
        self.list_depth -= 1
        if self.list_depth == 0:
            self.output.append("\n")

    def visit_list_item(self, node):
        indent = "  " * (self.list_depth - 1)
        if getattr(self, "_in_blockquote", False):
            # Inside blockquote - add > prefix
            if isinstance(node.parent, docutils.nodes.bullet_list):
                self.output.append(f"> {indent}- ")
            else:
                self.output.append(f"> {indent}1. ")
        else:
            if isinstance(node.parent, docutils.nodes.bullet_list):
                self.output.append(f"{indent}- ")
            else:
                self.output.append(f"{indent}1. ")

    def depart_list_item(self, node):
        self.output.append("\n")

    def visit_reference(self, node):
        if "refuri" in node:
            self.output.append("[")

    def depart_reference(self, node):
        if "refuri" in node:
            self.output.append(f"]({node['refuri']})")

    def visit_target(self, node):
        # Skip internal targets for cleaner output
        pass

    def depart_target(self, node):
        pass

    def visit_block_quote(self, node):
        # block_quote nodes in RST should become markdown blockquotes
        self.output.append("\n")
        self._in_blockquote = True

    def depart_block_quote(self, node):
        self.output.append("\n\n")
        self._in_blockquote = False

    def visit_image(self, node):
        uri = node["uri"]
        alt = node.get("alt", "")
        self.output.append(f"![{alt}]({uri})")

    def depart_image(self, node):
        pass

    def visit_line_block(self, node):
        pass

    def depart_line_block(self, node):
        self.output.append("\n\n")

    def visit_line(self, node):
        pass

    def depart_line(self, node):
        self.output.append("  \n")  # Two spaces for line break

    def visit_transition(self, node):
        self.output.append("\n---\n\n")

    def depart_transition(self, node):
        pass

    def unknown_visit(self, node):
        """Handle unknown nodes gracefully."""
        pass

    def unknown_departure(self, node):
        """Handle unknown nodes gracefully."""
        pass


class RSTToMarkdownConverter:
    """Main converter class that handles the full conversion process."""

    def __init__(self):
        pass

    def parse_frontmatter(
        self, content: str
    ) -> Tuple[Dict[str, Union[str, List[str]]], str]:
        """Parse frontmatter from RST content."""
        lines = content.split("\n")
        frontmatter = {}
        content_start = 0
        i = 0

        while i < len(lines):
            line = lines[i]

            if line.strip() == "":
                content_start = i + 1
                break

            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()

                # Handle multiline values (YAML literal block scalar)
                if value == "|":
                    # Collect indented lines following the |
                    multiline_content = []
                    i += 1

                    # Look for indented lines
                    while i < len(lines):
                        next_line = lines[i]
                        if next_line.startswith("  ") and next_line.strip():
                            # Add the line without the leading spaces
                            multiline_content.append(next_line[2:])
                            i += 1
                        elif next_line.strip() == "":
                            # Empty line - could be end of block or spacing within block
                            # Peek ahead to see if there are more indented lines
                            j = i + 1
                            while j < len(lines) and lines[j].strip() == "":
                                j += 1

                            if j < len(lines) and lines[j].startswith("  "):
                                # More indented content follows, include empty line
                                multiline_content.append("")
                                i += 1
                            else:
                                # End of multiline block
                                break
                        else:
                            # Non-indented line, end of multiline block
                            break

                    # Only join if we have actual content, otherwise skip this field
                    content = "\n".join(multiline_content).strip()
                    if content:  # Only add if there's actual content
                        frontmatter[key] = content
                    # If empty content, don't add the key at all
                    continue

                # Handle lists (tags)
                elif value.startswith("[") and value.endswith("]"):
                    # Parse list format: [tag1, tag2, tag3]
                    value = value[1:-1]  # Remove brackets
                    if value:
                        frontmatter[key] = [tag.strip() for tag in value.split(",")]
                    else:
                        frontmatter[key] = []
                else:
                    frontmatter[key] = value

            i += 1

        return frontmatter, "\n".join(lines[content_start:])

    def format_frontmatter(self, frontmatter: Dict[str, Union[str, List[str]]]) -> str:
        """Format frontmatter as YAML."""
        lines = ["---"]

        for key, value in frontmatter.items():
            if isinstance(value, list):
                if value:
                    lines.append(f"{key}:")
                    for item in value:
                        lines.append(f"  - {item}")
                else:
                    lines.append(f"{key}: []")
            elif value:  # Only include non-empty values
                # Use YAML block scalar for multiline content or content with quotes
                if '\n' in value or '"' in value:
                    lines.append(f"{key}: |")
                    for line in value.split('\n'):
                        lines.append(f"  {line}")
                else:
                    lines.append(f"{key}: {value}")
            else:
                lines.append(f'{key}: ""')

        lines.append("---")
        return "\n".join(lines) + "\n\n"

    def convert_ast_to_markdown(self, document: docutils.nodes.document) -> str:
        """Convert docutils AST to Markdown."""
        writer = MarkdownWriter(document)

        # Use docutils' built-in visitor pattern
        document.walkabout(writer)

        return "".join(writer.output)

    def convert_rst_content(self, rst_content: str) -> str:
        """Convert RST content to Markdown using docutils AST."""
        try:
            # Parse with docutils
            document = docutils.core.publish_doctree(rst_content)

            # Convert to markdown
            markdown_content = self.convert_ast_to_markdown(document)

            # Clean up excessive whitespace
            markdown_content = re.sub(r"\n{3,}", "\n\n", markdown_content)
            markdown_content = markdown_content.strip() + "\n"

            return markdown_content

        except Exception as e:
            print(f"Error converting RST content: {e}")
            # Fallback: return original content with warning
            return f"<!-- RST conversion failed: {e} -->\n{rst_content}"

    def convert_file(self, input_path: Path, output_path: Path) -> bool:
        """Convert a single RST file to Markdown."""
        try:
            # Read input file
            with open(input_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse frontmatter and content
            frontmatter, rst_content = self.parse_frontmatter(content)

            # Convert RST content to Markdown
            markdown_content = self.convert_rst_content(rst_content)

            # Format output
            if frontmatter:
                output_content = self.format_frontmatter(frontmatter) + markdown_content
            else:
                output_content = markdown_content

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Write output file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(output_content)

            return True

        except Exception as e:
            print(f"Error converting {input_path}: {e}")
            return False

    def convert_directory(self, input_dir: Path, output_dir: Path) -> Tuple[int, int]:
        """Convert all RST files in a directory tree."""
        converted = 0
        failed = 0

        for rst_file in input_dir.rglob("*.rst"):
            # Calculate relative path
            rel_path = rst_file.relative_to(input_dir)

            # Change extension to .md
            md_path = output_dir / rel_path.with_suffix(".md")

            print(f"Converting {rst_file} -> {md_path}")

            if self.convert_file(rst_file, md_path):
                converted += 1
            else:
                failed += 1

        return converted, failed


def main():
    """Main entry point for the conversion script."""
    if len(sys.argv) < 3:
        print("Usage: python convert_rst_to_md.py <input_dir> <output_dir>")
        print("       python convert_rst_to_md.py <input_file.rst> <output_file.md>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    converter = RSTToMarkdownConverter()

    if input_path.is_file():
        # Convert single file
        if converter.convert_file(input_path, output_path):
            print(f"Successfully converted {input_path} to {output_path}")
        else:
            print(f"Failed to convert {input_path}")
            sys.exit(1)
    elif input_path.is_dir():
        # Convert directory
        converted, failed = converter.convert_directory(input_path, output_path)
        print(f"Conversion complete: {converted} files converted, {failed} failed")
        if failed > 0:
            sys.exit(1)
    else:
        print(f"Input path {input_path} does not exist")
        sys.exit(1)


if __name__ == "__main__":
    main()
