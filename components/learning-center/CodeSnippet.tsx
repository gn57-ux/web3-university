const CODE_LINES = [
  { text: "pragma solidity ^0.8.0;", kind: "keyword" },
  { text: "", kind: "plain" },
  { text: "contract HelloWeb3 {", kind: "keyword" },
  { text: '    string public greeting = "Welcome to Web3 University!";', kind: "plain" },
  { text: "", kind: "plain" },
  { text: "    function setGreeting(string memory _newGreeting) public {", kind: "keyword" },
  { text: "        greeting = _newGreeting;", kind: "plain" },
  { text: "    }", kind: "plain" },
  { text: "}", kind: "plain" },
] as const;

const KIND_CLASS: Record<(typeof CODE_LINES)[number]["kind"], string> = {
  keyword: "text-secondary",
  plain: "text-on-surface",
};

export function CodeSnippet() {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-4">
      <pre className="font-mono text-body-md leading-relaxed">
        <code>
          {CODE_LINES.map((line, index) => (
            <div key={index} className={KIND_CLASS[line.kind]}>
              {line.text || " "}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
