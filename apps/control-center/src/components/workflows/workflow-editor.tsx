"use client";

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    type NodeProps,
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Panel,
    ReactFlowProvider,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Cpu,
    Zap,
    Play,
    Save,
    Layout,
    Plus,
    Trash2,
    Settings2,
    Bot,
    Search,
    ChevronDown,
    X,
    Maximize,
    Minimize,
    Move,
    UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---

export type AgentMetadata = {
    id: string;
    name: string;
    description: string;
    color: string;
    division: string;
    filePath: string;
};

type WorkflowEditorProps = {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    onSave?: (nodes: Node[], edges: Edge[]) => void;
    availableAgents: AgentMetadata[];
};

// --- Custom Node Components ---

const AgentNode = ({ data, selected }: NodeProps<{ 
    label: string; 
    role: string; 
    model: string; 
    division?: string;
    color?: string;
    availableAgents?: AgentMetadata[];
    onUpdate?: (nodeId: string, data: any) => void;
    id: string;
}>) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelectAgent = (agent: AgentMetadata) => {
        if (data.onUpdate) {
            data.onUpdate(data.id, {
                ...data,
                label: agent.name,
                role: agent.id,
                division: agent.division,
                color: agent.color,
                filePath: agent.filePath
            });
        }
        setIsOpen(false);
    };

    const divisionColor = data.color || 'purple';

    return (
        <div className={cn(
            "group relative flex min-w-[240px] flex-col rounded-2xl border bg-card/90 backdrop-blur-sm p-4 transition-all duration-300",
            selected ? "border-brand-purple ring-1 ring-brand-purple/50 shadow-[0_0_20px_rgba(124,58,237,0.15)]" : "border-border hover:border-brand-purple/50 shadow-sm"
        )}>
            <Handle 
                type="target" 
                position={Position.Top} 
                className="!h-2.5 !w-2.5 !border-[3px] !border-brand-purple !bg-background !transition-all hover:!scale-125" 
            />

            <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                    divisionColor === 'purple' ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20" :
                    divisionColor === 'green' ? "bg-status-green/10 text-status-green border-status-green/20" :
                    divisionColor === 'blue' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                )}>
                    <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <h3 className="text-sm font-bold tracking-tight text-foreground truncate">{data.label || 'Select Agent'}</h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted truncate">{data.division || 'Unassigned'}</p>
                </div>
                
                {/* Agent Selector Dropdown (Quick Switch) */}
                <div className="relative">
                    <button 
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-all"
                    >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    
                    {isOpen && (
                        <div className="absolute top-full right-0 mt-2 z-50 w-64 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 space-y-1">
                                {data.availableAgents?.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => handleSelectAgent(agent)}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-brand-purple/10 hover:text-brand-purple transition-colors text-[11px] font-medium"
                                    >
                                        <div className="font-bold">{agent.name}</div>
                                        <div className="text-[9px] opacity-70 uppercase tracking-tighter">{agent.division}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Compute Architecture</span>
                    <span className="rounded-lg bg-foreground/5 px-2 py-0.5 text-[9px] font-mono font-bold text-zinc-400">{data.model || 'gpt-4o-mini'}</span>
                </div>
                
                {data.role && (
                    <div className="rounded-lg bg-muted/30 p-2 border border-border/50">
                        <p className="text-[9px] text-muted line-clamp-2 italic leading-relaxed">
                            {data.availableAgents?.find(a => a.id === data.role)?.description || 'No description available.'}
                        </p>
                    </div>
                )}
            </div>

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!h-2.5 !w-2.5 !border-[3px] !border-brand-purple !bg-background !transition-all hover:!scale-125" 
            />
        </div>
    );
};

const TriggerNode = ({ data, selected }: NodeProps<{ label: string }>) => {
    return (
        <div className={cn(
            "group relative flex min-w-[200px] flex-col rounded-[2rem] border border-status-green bg-card/90 backdrop-blur-sm p-4 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.1)]",
            selected ? "ring-2 ring-status-green/50 scale-105" : "hover:border-status-green/80"
        )}>
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-status-green/20 text-status-green border border-status-green/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Zap className="h-6 w-6 fill-current" />
                </div>
                <div>
                    <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground">{data.label || 'Manual Trigger'}</h3>
                    <p className="text-[9px] font-bold text-status-green/80 uppercase tracking-tighter">System Entry Point</p>
                </div>
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!h-3 !w-3 !border-[3px] !border-status-green !bg-background" 
            />
        </div>
    );
};

const nodeTypes = {
    agent: AgentNode,
    trigger: TriggerNode,
};

// --- Collaborative Dropdown Components ---

const AgentAddDropdown = ({ agents, onAdd, isOpen, onClose }: { agents: AgentMetadata[], onAdd: (agent: AgentMetadata) => void, isOpen: boolean, onClose: () => void }) => {
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter agents
    const filteredAgents = useMemo(() => {
        if (!search) return agents;
        return agents.filter(a => 
            a.name.toLowerCase().includes(search.toLowerCase()) || 
            a.division.toLowerCase().includes(search.toLowerCase())
        );
    }, [agents, search]);

    // Group by division
    const groups = useMemo(() => {
        const g: Record<string, AgentMetadata[]> = {};
        filteredAgents.forEach(a => {
            if (!g[a.division]) g[a.division] = [];
            g[a.division].push(a);
        });
        return g;
    }, [filteredAgents]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-full right-0 mt-3 w-80 z-50 flex flex-col rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Bot className="h-4 w-4 text-brand-purple" />
                        Intelligence Catalog
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search specialists..."
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-brand-purple/20 transition-all font-medium"
                    />
                </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {Object.entries(groups).map(([division, items]) => (
                    <div key={division} className="py-2">
                        <h3 className="text-[9px] font-bold text-muted uppercase tracking-widest px-3 mb-2">{division}</h3>
                        <div className="space-y-1 px-1">
                            {items.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => {
                                        onAdd(agent);
                                        onClose();
                                    }}
                                    className="w-full text-left p-3 rounded-xl hover:bg-brand-purple/10 border border-transparent hover:border-brand-purple/20 transition-all group flex items-start gap-3"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-lg bg-background border border-border flex items-center justify-center text-muted group-hover:text-brand-purple transition-colors">
                                        <Cpu className="h-4 w-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[11px] font-bold group-hover:text-brand-purple transition-colors truncate">{agent.name}</p>
                                        <p className="text-[9px] text-muted line-clamp-1 mt-0.5">{agent.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                
                {filteredAgents.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-muted italic p-4">
                        <p className="text-[11px]">No matching specialized agents found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Internal Editor with Flow Hooks ---

function EditorInternal({ initialNodes, initialEdges, onSave, availableAgents }: WorkflowEditorProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
    const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
    
    const { screenToFlowPosition, getViewport, zoomIn, zoomOut, fitView } = useReactFlow();

    // Custom update function passed to nodes
    const onNodeUpdate = useCallback((nodeId: string, newData: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
    }, [setNodes]);

    // Enhanced nodes with helper data
    const enhancedNodes = useMemo(() => nodes.map(n => {
        if (n.type === 'agent') {
            return {
                ...n,
                data: {
                    ...n.data,
                    availableAgents,
                    onUpdate: onNodeUpdate,
                    id: n.id
                }
            };
        }
        return n;
    }), [nodes, availableAgents, onNodeUpdate]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
        ...params,
        type: 'default',
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 }
    }, eds)), [setEdges]);

    const handleAddAgent = (agent: AgentMetadata) => {
        // Calculate center of current view
        const { x, y, zoom } = getViewport();
        const center = {
            x: (-x + (reactFlowWrapper.current?.clientWidth || 0) / 2) / zoom,
            y: (-y + (reactFlowWrapper.current?.clientHeight || 0) / 2) / zoom,
        };

        const newNode: Node = {
            id: `node_${Date.now()}`,
            type: 'agent',
            position: center,
            data: { 
                label: agent.name, 
                role: agent.id, 
                model: 'gpt-4o-mini',
                division: agent.division,
                color: agent.color,
                filePath: agent.filePath
            },
        };

        setNodes((nds) => nds.concat(newNode));
    };

    const handleSave = () => {
        if (onSave) onSave(nodes, edges);
    };

    return (
        <div 
            ref={reactFlowWrapper}
            className="h-full w-full bg-background rounded-[2.5rem] border border-border overflow-hidden relative shadow-2xl"
        >
            <ReactFlow
                nodes={enhancedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px]"
            >
                <Background color="#3f3f46" variant="dots" gap={24} />
                <Controls showInteractive={false} className="hidden" /> {/* Hidden default controls */}
                
                <MiniMap
                    nodeColor={(n) => {
                        if (n.type === 'trigger') return '#10b981';
                        return '#7c3aed';
                    }}
                    maskColor="rgba(0, 0, 0, 0.3)"
                    className="!bg-card/80 !backdrop-blur-md !border-border !rounded-2xl !hidden md:!block"
                />

                {/* Floating Toolbar Panel */}
                <Panel position="top-right" className="flex items-center gap-2 p-6">
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/90 backdrop-blur-md p-2 shadow-2xl">
                        {/* Zoom Controls */}
                        <div className="flex gap-1 pr-2 border-r border-border">
                            <button
                                onClick={() => zoomIn()}
                                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted hover:text-foreground transition-all"
                                title="Zoom In"
                            >
                                <Maximize className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => zoomOut()}
                                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted hover:text-foreground transition-all"
                                title="Zoom Out"
                            >
                                <Minimize className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => fitView()}
                                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted hover:text-foreground transition-all"
                                title="Fit View"
                            >
                                <Move className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {/* Add Agent Dropdown Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                                className={cn(
                                    "flex h-10 gap-2 items-center px-4 rounded-xl transition-all font-bold text-[10px] uppercase tracking-[0.1em] border shadow-sm",
                                    isAgentMenuOpen 
                                        ? "bg-brand-purple text-white border-brand-purple" 
                                        : "bg-muted text-foreground border-border hover:border-brand-purple/50"
                                )}
                            >
                                <UserPlus className="h-4 w-4" />
                                Add Agent
                                <ChevronDown className={cn("h-3 w-3 transition-transform", isAgentMenuOpen && "rotate-180")} />
                            </button>
                            
                            <AgentAddDropdown 
                                agents={availableAgents} 
                                isOpen={isAgentMenuOpen} 
                                onClose={() => setIsAgentMenuOpen(false)}
                                onAdd={handleAddAgent}
                            />
                        </div>

                        <div className="h-6 w-[1px] bg-border mx-1" />

                        <button
                            onClick={handleSave}
                            className="flex h-10 gap-2 items-center px-5 rounded-xl bg-foreground text-card hover:opacity-90 transition-all font-bold text-[10px] uppercase tracking-[0.1em] shadow-lg"
                        >
                            <Save className="h-4 w-4" />
                            Save Design
                        </button>
                    </div>
                </Panel>

                {/* Status Indicator Panel */}
                <Panel position="bottom-right" className="p-6">
                    <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card/80 backdrop-blur-md p-5 shadow-2xl min-w-[200px]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                                <Layout className="h-4 w-4" />
                            </div>
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Intelligence Matrix</h2>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase">
                                <span>Active Nodes</span>
                                <span className="text-foreground">{nodes.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase">
                                <span>Signal Paths</span>
                                <span className="text-foreground">{edges.length}</span>
                            </div>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

// --- Wrapper to provide ReactFlow context ---

export function WorkflowEditor(props: WorkflowEditorProps) {
    return (
        <ReactFlowProvider>
            <EditorInternal {...props} />
        </ReactFlowProvider>
    );
}
