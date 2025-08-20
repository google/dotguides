import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Workspace } from "../lib/workspace.js";
import { Guide } from "../lib/guide.js";

export class DotguidesMcp {
  private guides: Guide[] = [];

  constructor(private workspace: Workspace) {}

  async discover() {
    const packages = Object.values(this.workspace.packages);
    for (const pkg of packages) {
      const setup = pkg.guides["setup"];
      if (setup) {
        this.guides.push(setup);
      }
      const usage = pkg.guides["usage"];
      if (usage) {
        this.guides.push(usage);
      }
      const style = pkg.guides["style"];
      if (style) {
        this.guides.push(style);
      }
    }
  }

  async register(server: McpServer): Promise<void> {
    for (const guide of this.guides) {
      const frontmatter = await guide.getFrontmatter();
      server.registerResource(
        `guide:${frontmatter.name}`,
        `guide:${frontmatter.name}`,
        {
          title: frontmatter.name,
          description: frontmatter.description,
        },
        async () => {
          return {
            contents: [
              {
                uri: `guide:${frontmatter.name}`,
                text: await guide.render({}),
              },
            ],
          };
        }
      );
    }
  }
}
