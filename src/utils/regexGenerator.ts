import type { Node, Edge } from 'reactflow';

export const generateRegex = (
  nodes: Node[], 
  edges: Edge[],
  userFlags?: { caseInsensitive: boolean; multiline: boolean; dotAll: boolean }
): string => {
  if (nodes.length === 0) return '';

  // Find all start nodes (nodes with no incoming edges)
  const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
  
  if (startNodes.length === 0) {
    // If there is a cycle and no start node, pick the left-most node
    const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);
    startNodes.push(sortedNodes[0]);
  }

  // Sort start nodes by their X coordinate so we start from the left-most
  startNodes.sort((a, b) => a.position.x - b.position.x);
  
  // We trace the primary chain starting from the left-most start node
  const startNode = startNodes[0];
  let currentNode: Node | undefined = startNode;
  const visited = new Set<string>();
  const chain: Node[] = [];

  while (currentNode && !visited.has(currentNode.id)) {
    visited.add(currentNode.id);
    chain.push(currentNode);
    
    // Find the next connected node
    const edge = edges.find(e => e.source === currentNode?.id);
    currentNode = edge ? nodes.find(n => n.id === edge.target) : undefined;
  }

  // Compiler state: stack of buffers for handling groups
  const bufferStack: string[][] = [[]];
  const groupStack: { type: string; prefix: string }[] = [];
  let hasCaseInsensitive = false;

  const pushToTopBuffer = (str: string) => {
    bufferStack[bufferStack.length - 1].push(str);
  };

  const getTopBuffer = (): string[] => {
    return bufferStack[bufferStack.length - 1];
  };

  for (const node of chain) {
    const data = node.data || {};
    
    switch (node.type) {
      case 'text': {
        const val = data.value || '';
        const escaped = escapeRegExp(val);
        if (data.caseInsensitive) {
          hasCaseInsensitive = true;
          // Alternative approach: translate each letter to class like [aA] to be flavor-independent,
          // but we can also just set the global flag. Let's do both: set flag, and also support literal escape
          pushToTopBuffer(escaped);
        } else {
          pushToTopBuffer(escaped);
        }
        break;
      }

      case 'charClass': {
        const negated = !!data.negated;
        const prefix = negated ? '^' : '';
        let classContent = '';
        
        switch (data.classPreset) {
          case 'digits':
            classContent = negated ? '\\D' : '\\d';
            pushToTopBuffer(classContent);
            break;
          case 'letters':
            classContent = `[${prefix}a-zA-Z]`;
            pushToTopBuffer(classContent);
            break;
          case 'wordChars':
            classContent = negated ? '\\W' : '\\w';
            pushToTopBuffer(classContent);
            break;
          case 'whitespace':
            classContent = negated ? '\\S' : '\\s';
            pushToTopBuffer(classContent);
            break;
          case 'custom':
          default:
            const val = data.value || '';
            // If the user typed square brackets themselves, strip them to avoid duplicate brackets
            const cleanVal = val.replace(/^\[|\]$/g, '');
            classContent = `[${prefix}${cleanVal}]`;
            pushToTopBuffer(classContent);
            break;
        }
        break;
      }

      case 'anyChar':
        pushToTopBuffer('.');
        break;

      case 'startAnchor':
        pushToTopBuffer('^');
        break;

      case 'endAnchor':
        pushToTopBuffer('$');
        break;

      case 'wordBoundary':
        pushToTopBuffer('\\b');
        break;

      case 'groupStart': {
        let prefix = '(';
        const gType = data.groupType || 'capturing';
        
        if (gType === 'nonCapturing') {
          prefix = '(?:';
        } else if (gType === 'lookaheadPos') {
          prefix = '(?=';
        } else if (gType === 'lookaheadNeg') {
          prefix = '(?!';
        } else if (gType === 'lookbehindPos') {
          prefix = '(?<=';
        } else if (gType === 'lookbehindNeg') {
          prefix = '(?<!';
        } else if (gType === 'named') {
          const name = data.groupName || 'group';
          prefix = `(?<${name}>`;
        }
        
        bufferStack.push([]);
        groupStack.push({ type: gType, prefix });
        break;
      }

      case 'groupEnd': {
        if (bufferStack.length > 1) {
          const popped = bufferStack.pop() || [];
          const groupBody = popped.join('');
          const groupInfo = groupStack.pop() || { type: 'capturing', prefix: '(' };
          
          pushToTopBuffer(`${groupInfo.prefix}${groupBody})`);
        }
        break;
      }

      case 'or': {
        const options: string[] = data.options || ['opt1', 'opt2'];
        const compiledOptions = options.map(opt => escapeRegExp(opt)).join('|');
        pushToTopBuffer(`(?:${compiledOptions})`);
        break;
      }

      case 'quantifier': {
        const currentBuffer = getTopBuffer();
        if (currentBuffer.length > 0) {
          let lastSegment = currentBuffer.pop() || '';
          
          // If the last segment is the "number" preset (\d+), strip the "+" when applying a quantifier
          if (lastSegment === '\\d+') {
            lastSegment = '\\d';
          }
          
          // Determine if we need to wrap the last segment in a non-capturing group
          // We wrap if: length > 1 AND it is not already enclosed in [ ] or ( )
          const needsGrouping = 
            lastSegment.length > 1 && 
            !((lastSegment.startsWith('[') && lastSegment.endsWith(']')) || 
              (lastSegment.startsWith('(') && lastSegment.endsWith(')')) ||
              (lastSegment.startsWith('\\') && lastSegment.length === 2)); // e.g. \d, \w
          
          if (needsGrouping) {
            lastSegment = `(?:${lastSegment})`;
          }
          
          let suffix = '+';
          const qType = data.quantifierType || 'oneOrMore';
          
          if (qType === 'zeroOrMore') {
            suffix = '*';
          } else if (qType === 'optional') {
            suffix = '?';
          } else if (qType === 'exact') {
            const n = data.n || 1;
            suffix = `{${n}}`;
          } else if (qType === 'min') {
            const n = data.n || 1;
            suffix = `{${n},}`;
          } else if (qType === 'range') {
            const n = data.n || 1;
            const m = data.m || 2;
            suffix = `{${n},${m}}`;
          }
          
          if (data.lazy) {
            suffix += '?';
          }
          
          currentBuffer.push(`${lastSegment}${suffix}`);
        }
        break;
      }

      case 'email':
        pushToTopBuffer('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
        break;

      case 'number':
        pushToTopBuffer('\\d+');
        break;

      case 'ipv4':
        pushToTopBuffer('(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)');
        break;

      case 'password':
        pushToTopBuffer('(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}');
        break;
    }
  }

  // Handle any remaining unclosed groups
  while (bufferStack.length > 1) {
    const popped = bufferStack.pop() || [];
    const groupBody = popped.join('');
    const groupInfo = groupStack.pop() || { type: 'capturing', prefix: '(' };
    pushToTopBuffer(`${groupInfo.prefix}${groupBody})`);
  }

  const finalPattern = bufferStack[0].join('');
  let flags = 'g';
  if (userFlags) {
    if (userFlags.caseInsensitive || hasCaseInsensitive) flags += 'i';
    if (userFlags.multiline) flags += 'm';
    if (userFlags.dotAll) flags += 's';
  } else {
    flags += (hasCaseInsensitive ? 'i' : '');
  }
  
  return `/${finalPattern}/${flags}`;
};

function escapeRegExp(string: string) {
  // Escapes special characters for regex literals
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
