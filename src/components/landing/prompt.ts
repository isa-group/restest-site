// What to tell a coding agent, on the first page twice: under "Coding agent" at the top, and in the band
// for coding agents. It is the sentence RESTest's README and its page for coding agents give, pointing at
// that page on this site, which describes the version the agent will install.

export const agentPrompt = (page: string) =>
  `Use RESTest to test the REST APIs you develop in this project. Follow the setup and usage instructions at ${page}`;
