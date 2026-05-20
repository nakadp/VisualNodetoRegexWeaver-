import type { Node, Edge } from 'reactflow';

export const generateRegex = (nodes: Node[], edges: Edge[]): string => {
  // Find start nodes (nodes with no incoming edges or marked as start)
  const startNodes = nodes.filter(n => n.type === 'input' || !edges.find(e => e.target === n.id));
  
  if (startNodes.length === 0) return '';

  let result = '';
  
  // Simple linear traversal for MVP
  let currentNode: Node | undefined = startNodes[0];
  const visited = new Set<string>();

  while (currentNode && !visited.has(currentNode.id)) {
    visited.add(currentNode.id);
    
    // Add logic based on node type
    switch (currentNode.type) {
      case 'text':
        result += escapeRegExp(currentNode.data.value || '');
        break;
      case 'charClass':
        result += `[${currentNode.data.value || ''}]`;
        break;
      case 'anyChar':
        result += '.';
        break;
      case 'startAnchor':
        result += '^';
        break;
      case 'endAnchor':
        result += '$';
        break;
      case 'quantifier':
        const q = currentNode.data.value || '+';
        result += q === 'n' ? `{${currentNode.data.n || 1}}` : q;
        break;
      case 'email':
        result += '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
        break;
      case 'number':
        result += '\\d+';
        break;
      case 'ipv4':
        result += '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
        break;
      // Add more cases here...
    }

    // Find next node
    const edge = edges.find(e => e.source === currentNode?.id);
    currentNode = edge ? nodes.find(n => n.id === edge.target) : undefined;
  }

  return `/${result}/g`;
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
