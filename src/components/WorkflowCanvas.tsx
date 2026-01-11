import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    type Node,
    type Connection,
    useNodesState,
    useEdgesState,
    type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useWorkflowStore } from '../store/workflowStore';

const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

export default function WorkflowCanvas() {
    const { nodes: storeNodes, edges: storeEdges, updateNode, addEdge: addStoreEdge, setCurrentNode } = useWorkflowStore();

    const [, , onNodesChange] = useNodesState(storeNodes);
    const [, , onEdgesChange] = useEdgesState(storeEdges);

    // Sync with store
    const reactFlowNodes = useMemo(() => {
        return storeNodes.map((node) => ({
            ...node,
            type: 'custom',
        }));
    }, [storeNodes]);

    const onConnect = useCallback(
        (params: Connection) => {
            const newEdge = {
                id: `e${params.source}-${params.target}`,
                source: params.source!,
                target: params.target!,
            };
            addStoreEdge(newEdge);
        },
        [addStoreEdge]
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setCurrentNode(node.id);
        },
        [setCurrentNode]
    );

    const onNodesDelete = useCallback(
        (deleted: Node[]) => {
            deleted.forEach((node) => {
                updateNode(node.id, { data: { ...node.data, status: 'pending' } });
            });
        },
        [updateNode]
    );

    return (
        <div className="w-full h-full">
            <ReactFlowProvider>
                <ReactFlow
                    nodes={reactFlowNodes}
                    edges={storeEdges}
                    onNodesChange={(changes) => {
                        onNodesChange(changes);
                        // Update store when nodes change
                        changes.forEach((change) => {
                            if (change.type === 'position' && change.position) {
                                updateNode(change.id, { position: change.position });
                            }
                        });
                    }}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onNodesDelete={onNodesDelete}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-gray-50"
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}
