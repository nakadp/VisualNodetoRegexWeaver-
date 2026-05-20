import regexpTree from 'regexp-tree';
import type { Node, Edge } from 'reactflow';

// Self-contained AST stringifier to recreate regex strings for disjunction alternatives
const stringifyAST = (node: any): string => {
  if (!node) return '';
  switch (node.type) {
    case 'Char':
      return node.value;
    case 'Alternative':
      return node.expressions.map(stringifyAST).join('');
    case 'Disjunction':
      return stringifyAST(node.left) + '|' + stringifyAST(node.right);
    case 'CharacterClass':
      return '[' + (node.negated ? '^' : '') + node.expressions.map(stringifyAST).join('') + ']';
    case 'ClassRange':
      return stringifyAST(node.from) + '-' + stringifyAST(node.to);
    case 'Quantifier':
      return stringifyAST(node.expression) + node.symbol + (node.greedy ? '' : '?');
    case 'Group':
      return '(' + (node.capturing ? '' : '?:') + stringifyAST(node.expression) + ')';
    case 'Assertion':
      return node.value;
    default:
      return '';
  }
};

export const reverseEngineer = (regexStr: string): { nodes: Node[], edges: Edge[] } => {
  if (!regexStr.trim()) return { nodes: [], edges: [] };
  
  try {
    // Clean outer slashes if user inputted them, e.g. /pattern/gi
    let cleanRegex = regexStr.trim();
    let hasGlobalIgnoreCase = false;
    
    const match = cleanRegex.match(/^\/(.*)\/([gimsuy]*)$/);
    if (match) {
      cleanRegex = regexStr; // regexpTree.parse handles /pattern/flags directly
      if (match[2].includes('i')) {
        hasGlobalIgnoreCase = true;
      }
    }
    
    const ast = regexpTree.parse(cleanRegex);
    const nodeDescriptions: any[] = [];
    
    // Traverse AST recursively to collect a list of flat node descriptions
    const traverse = (astNode: any) => {
      if (!astNode) return;
      
      switch (astNode.type) {
        case 'Alternative':
          if (astNode.expressions) {
            astNode.expressions.forEach((expr: any) => traverse(expr));
          }
          break;
          
        case 'Disjunction': {
          const collectOptions = (disj: any): string[] => {
            let opts: string[] = [];
            if (disj.type === 'Disjunction') {
              opts = opts.concat(collectOptions(disj.left));
              opts = opts.concat(collectOptions(disj.right));
            } else {
              opts.push(stringifyAST(disj));
            }
            return opts;
          };
          
          nodeDescriptions.push({
            type: 'or',
            label: 'Alternation (OR)',
            options: collectOptions(astNode)
          });
          break;
        }
        
        case 'Char': {
          if (astNode.value === '\\d') {
            nodeDescriptions.push({ type: 'number', label: 'Number' });
          } else if (astNode.value === '\\w') {
            nodeDescriptions.push({ type: 'charClass', label: 'Char Class', classPreset: 'wordChars', negated: false });
          } else if (astNode.value === '\\s') {
            nodeDescriptions.push({ type: 'charClass', label: 'Char Class', classPreset: 'whitespace', negated: false });
          } else if (astNode.value === '\\D') {
            nodeDescriptions.push({ type: 'charClass', label: 'Char Class', classPreset: 'digits', negated: true });
          } else if (astNode.value === '\\W') {
            nodeDescriptions.push({ type: 'charClass', label: 'Char Class', classPreset: 'wordChars', negated: true });
          } else if (astNode.value === '\\S') {
            nodeDescriptions.push({ type: 'charClass', label: 'Char Class', classPreset: 'whitespace', negated: true });
          } else if (astNode.value.startsWith('\\') && astNode.value.length === 2) {
            // Escaped special character, e.g. \. or \*
            nodeDescriptions.push({ type: 'text', label: 'Plain Text', value: astNode.value.slice(1), caseInsensitive: hasGlobalIgnoreCase });
          } else {
            // Plain character
            nodeDescriptions.push({ type: 'text', label: 'Plain Text', value: astNode.value, caseInsensitive: hasGlobalIgnoreCase });
          }
          break;
        }
        
        case 'CharacterClass': {
          const innerVal = astNode.expressions.map(stringifyAST).join('');
          nodeDescriptions.push({
            type: 'charClass',
            label: 'Char Class',
            classPreset: 'custom',
            value: innerVal,
            negated: !!astNode.negated
          });
          break;
        }
        
        case 'Quantifier': {
          // In a flat layout, we compile the inner expression first, then append the quantifier node
          traverse(astNode.expression);
          
          let qType = 'oneOrMore';
          let n = 1;
          let m = 2;
          const symbol = astNode.symbol || '';
          
          if (symbol === '+') {
            qType = 'oneOrMore';
          } else if (symbol === '*') {
            qType = 'zeroOrMore';
          } else if (symbol === '?') {
            qType = 'optional';
          } else if (symbol.startsWith('{')) {
            const matchExact = symbol.match(/^\{(\d+)\}$/);
            const matchMin = symbol.match(/^\{(\d+),\}$/);
            const matchRange = symbol.match(/^\{(\d+),(\d+)\}$/);
            
            if (matchExact) {
              qType = 'exact';
              n = parseInt(matchExact[1]);
            } else if (matchMin) {
              qType = 'min';
              n = parseInt(matchMin[1]);
            } else if (matchRange) {
              qType = 'range';
              n = parseInt(matchRange[1]);
              m = parseInt(matchRange[2]);
            }
          }
          
          nodeDescriptions.push({
            type: 'quantifier',
            label: 'Quantifier',
            quantifierType: qType,
            n,
            m,
            lazy: !astNode.greedy
          });
          break;
        }
        
        case 'Group': {
          let gType = astNode.capturing ? 'capturing' : 'nonCapturing';
          let groupName = '';
          if (astNode.name) {
            gType = 'named';
            groupName = astNode.name;
          }
          
          nodeDescriptions.push({
            type: 'groupStart',
            label: 'Group Start',
            groupType: gType,
            groupName
          });
          
          traverse(astNode.expression);
          
          nodeDescriptions.push({
            type: 'groupEnd',
            label: 'Group End'
          });
          break;
        }
        
        case 'Assertion': {
          if (astNode.kind === '^') {
            nodeDescriptions.push({ type: 'startAnchor', label: 'Line Start' });
          } else if (astNode.kind === '$') {
            nodeDescriptions.push({ type: 'endAnchor', label: 'Line End' });
          } else if (astNode.code === '\\b') {
            nodeDescriptions.push({ type: 'wordBoundary', label: 'Word Boundary' });
          } else if (astNode.kind === 'Lookahead' || astNode.kind === 'Lookbehind') {
            const gType = astNode.kind === 'Lookahead' 
              ? (astNode.negative ? 'lookaheadNeg' : 'lookaheadPos') 
              : (astNode.negative ? 'lookbehindNeg' : 'lookbehindPos');
              
            nodeDescriptions.push({
              type: 'groupStart',
              label: 'Group Start',
              groupType: gType
            });
            
            traverse(astNode.assertion);
            
            nodeDescriptions.push({
              type: 'groupEnd',
              label: 'Group End'
            });
          }
          break;
        }
        
        case 'RegExp':
          traverse(astNode.body);
          break;
      }
    };
    
    traverse(ast);
    
    // Merge consecutive 'text' nodes for a cleaner canvas graph
    const mergedDescriptions: any[] = [];
    for (const desc of nodeDescriptions) {
      if (
        desc.type === 'text' && 
        mergedDescriptions.length > 0 && 
        mergedDescriptions[mergedDescriptions.length - 1].type === 'text'
      ) {
        mergedDescriptions[mergedDescriptions.length - 1].value += desc.value;
      } else {
        mergedDescriptions.push({ ...desc });
      }
    }
    
    // Build React Flow nodes and edges from the descriptions
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    mergedDescriptions.forEach((desc, idx) => {
      const nodeId = `${Date.now()}-${idx}`;
      
      nodes.push({
        id: nodeId,
        type: desc.type,
        position: { x: 50 + idx * 220, y: 150 },
        data: {
          label: desc.label,
          type: desc.type,
          value: desc.value,
          caseInsensitive: desc.caseInsensitive,
          classPreset: desc.classPreset,
          negated: desc.negated,
          quantifierType: desc.quantifierType,
          n: desc.n,
          m: desc.m,
          lazy: desc.lazy,
          groupType: desc.groupType,
          groupName: desc.groupName,
          options: desc.options
        }
      });
      
      if (idx > 0) {
        const prevNodeId = nodes[idx - 1].id;
        edges.push({
          id: `e-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId
        });
      }
    });
    
    return { nodes, edges };
  } catch (e) {
    console.error('Reverse engineering failed:', e);
    return { nodes: [], edges: [] };
  }
};
