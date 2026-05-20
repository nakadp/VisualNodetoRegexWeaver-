import regexpTree from 'regexp-tree';
import type { Node, Edge } from 'reactflow';

export const reverseEngineer = (regexStr: string): { nodes: Node[], edges: Edge[] } => {
  try {
    const ast = regexpTree.parse(regexStr);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Simple tree traversal to create nodes
    let nodeId = 0;
    
    const traverse = (astNode: any, parentId: string | null = null) => {
      const id = `${nodeId++}`;
      let label = astNode.type;
      let type = 'text';
      let value = '';

      if (astNode.type === 'Char') {
        value = astNode.value;
        label = `Char: ${value}`;
      } else if (astNode.type === 'CharacterClass') {
        label = 'Char Class';
        type = 'charClass';
      }
      
      nodes.push({
        id,
        type,
        data: { label, value, type },
        position: { x: nodeId * 100, y: nodeId * 50 }
      });

      if (parentId) {
        edges.push({ id: `e${parentId}-${id}`, source: parentId, target: id });
      }

      // Recursively traverse children if any (simplified)
      if (astNode.expressions) {
        astNode.expressions.forEach((expr: any) => traverse(expr, id));
      } else if (astNode.expression) {
        traverse(astNode.expression, id);
      }
    };

    traverse(ast.body);
    return { nodes, edges };
  } catch (e) {
    console.error('Reverse engineering failed:', e);
    return { nodes: [], edges: [] };
  }
};
