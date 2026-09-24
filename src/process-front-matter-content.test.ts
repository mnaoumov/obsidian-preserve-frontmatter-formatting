import { parseFrontmatter } from 'obsidian-dev-utils/obsidian/frontmatter';
import { enableFrontmatterFormattingPreservation } from 'obsidian-dev-utils/obsidian/frontmatter-formatting';
import {
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import { processFrontMatterContent } from './process-front-matter-content.ts';

const BODY = 'Body text\n';

describe('processFrontMatterContent', () => {
  beforeEach(() => {
    // The component registers the engine before this transform is ever reached; `obsidian-dev-utils/vitest-setup`
    // resets the registration between tests.
    enableFrontmatterFormattingPreservation();
  });

  it('should keep the comments, quoting, blank lines and inline lists of every property the change does not reach', () => {
    const content = `---\ntitle: "Old"   # the working title\ntags: [a, b]\n\nstatus: 'draft'\n---\n${BODY}`;

    const result = processFrontMatterContent(content, (frontmatter) => {
      frontmatter['status'] = 'done';
    });

    expect(result).toBe(`---\ntitle: "Old"   # the working title\ntags: [a, b]\n\nstatus: done\n---\n${BODY}`);
  });

  it('should return the content unchanged when the callback changes nothing', () => {
    const content = `---\ntitle:    "Old"   # spacing a re-stringify would lose\n---\n${BODY}`;

    expect(processFrontMatterContent(content, () => {
      // A read-only callback.
    })).toBe(content);
  });

  it('should leave an empty block alone when the callback changes nothing', () => {
    const content = `---\n---\n${BODY}`;

    expect(processFrontMatterContent(content, () => {
      // A read-only callback.
    })).toBe(content);
  });

  it('should hand the callback an empty object when the block is not a mapping', () => {
    const content = `---\njust a scalar\n---\n${BODY}`;
    let received: unknown;

    const result = processFrontMatterContent(content, (frontmatter) => {
      received = { ...frontmatter };
    });

    expect(received).toEqual({});
    expect(result).toBe(content);
  });

  it('should replace a non-mapping block when the callback adds a property', () => {
    const content = `---\njust a scalar\n---\n${BODY}`;

    const result = processFrontMatterContent(content, (frontmatter) => {
      frontmatter['title'] = 'New';
    });

    // The engine declines a block it cannot read as a mapping, so this one takes the whole-block rewrite.
    expect(parseFrontmatter(result)).toEqual({ title: 'New' });
    expect(result.endsWith(`---\n${BODY}`)).toBe(true);
  });

  it('should delete the whole block when the callback empties it', () => {
    const content = `---\ntitle: Old\n---\n${BODY}`;

    const result = processFrontMatterContent(content, (frontmatter) => {
      delete frontmatter['title'];
    });

    expect(result).toBe(BODY);
  });

  it('should create a block when the note has none', () => {
    const result = processFrontMatterContent(BODY, (frontmatter) => {
      frontmatter['title'] = 'New';
    });

    expect(result).toBe(`---\ntitle: New\n---\n${BODY}`);
  });

  it('should leave a note with no block unchanged when the callback adds nothing', () => {
    expect(processFrontMatterContent(BODY, () => {
      // A read-only callback.
    })).toBe(BODY);
  });

  it('should let an error thrown by the callback propagate', () => {
    const content = `---\ntitle: Old\n---\n${BODY}`;

    expect(() =>
      processFrontMatterContent(content, () => {
        throw new Error('callback failed');
      })
    ).toThrow('callback failed');
  });
});
