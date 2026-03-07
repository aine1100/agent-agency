"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
    Save,
    Layout,
    Plus,
    Bot,
    Search,
    ChevronDown,
    X,
    Maximize,
    Minimize,
    Move,
    UserPlus,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomDropdown } from '@/components/ui/custom-dropdown';

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
    onDelete?: (nodeId: string) => void;
    id: string;
}>) => {
    const handleSelectAgent = (agentId: string) => {
        const agent = data.availableAgents?.find(a => a.id === agentId);
        if (agent && data.onUpdate) {
            data.onUpdate(data.id, {
                ...data,
                label: agent.name,
                role: agent.id,
                division: agent.division,
                color: agent.color,
                filePath: agent.filePath
            });
        }
    };

    const divisionColor = data.color || 'purple';
    
    // Prepare options for CustomDropdown
    const agentOptions = useMemo(() => 
        (data.availableAgents || []).map(a => ({ value: a.id, label: a.name })),
    [data.availableAgents]);

    return (
        <div className={cn(
            "group relative flex min-w-[280px] flex-col rounded-[2rem] border bg-card/90 backdrop-blur-md p-5 transition-all duration-500",
            selected ? "border-brand-purple ring-1 ring-brand-purple/50 shadow-[0_20px_40px_rgba(124,58,237,0.1)] scale-[1.02]" : "border-border hover:border-brand-purple/30 shadow-sm"
        )}>
            {/* Delete Button (Visible on Hover or Selected) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (data.onDelete) data.onDelete(data.id);
                }}
                className={cn(
                    "absolute -top-3 -right-3 h-8 w-8 flex items-center justify-center rounded-full bg-status-red text-white shadow-lg shadow-status-red/20 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-50",
                    selected && "opacity-100"
                )}
            >
                <Trash2 className="h-4 w-4" />
            </button>

            <Handle 
                type="target" 
                position={Position.Top} 
                className="!h-3 !w-3 !border-[3px] !border-brand-purple !bg-background !transition-all hover:!scale-150" 
            />

            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 shadow-inner",
                    divisionColor === 'purple' ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20 shadow-brand-purple/5" :
                    divisionColor === 'green' ? "bg-status-green/10 text-status-green border-status-green/20 shadow-status-green/5" :
                    divisionColor === 'blue' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5" :
                    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 shadow-zinc-500/5"
                )}>
                    <Bot className="h-6 w-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <h3 className="text-[13px] font-bold tracking-tight text-foreground truncate leading-tight">{data.label || 'Select Agent'}</h3>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/60 mt-0.5">{data.division || 'Unit Unassigned'}</p>
                </div>
            </div>

            <div className="mt-5 space-y-4">
                {/* Use the project's CustomDropdown for role switching */}
                <CustomDropdown
                    label="Assigned Specialist"
                    value={data.role}
                    onChange={handleSelectAgent}
                    options={agentOptions}
                    className="!space-y-1"
                />

                <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Compute Host</span>
                    <span className="rounded-lg bg-foreground/5 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 border border-border/30">{data.model || 'gpt-4o-mini'}</span>
                </div>
                
                {data.role && (
                    <div className="rounded-2xl bg-muted/20 p-3 border border-border/40 shadow-inner">
                        <p className="text-[10px] text-muted italic leading-relaxed line-clamp-2">
                            {data.availableAgents?.find(a => a.id === data.role)?.description || 'Specialized intelligence unit awaiting deployment instructions.'}
                        </p>
                    </div>
                )}
            </div>

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!h-3 !w-3 !border-[3px] !border-brand-purple !bg-background !transition-all hover:!scale-150" 
            />
        </div>
    );
};

const TriggerNode = ({ data, selected }: NodeProps<{ label: string; onDelete?: (id: string) => void; id: string }>) => {
    return (
        <div className={cn(
            "group relative flex min-w-[220px] flex-col rounded-[2.5rem] border border-status-green bg-card/90 backdrop-blur-sm p-5 transition-all duration-500 shadow-[0_15px_35px_rgba(16,185,129,0.08)]",
            selected ? "ring-2 ring-status-green/50 scale-105" : "hover:border-status-green/80"
        )}>
            {/* Delete Button (Hidden for manual launch usually, but allowed if needed) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (data.onDelete) data.onDelete(data.id);
                }}
                className={cn(
                    "absolute -top-3 -right-3 h-8 w-8 flex items-center justify-center rounded-full bg-status-red text-white shadow-lg shadow-status-red/20 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-50"
                )}
            >
                <Trash2 className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-green/20 text-status-green border border-status-green/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
                    <Zap className="h-6 w-6 fill-current" />
                </div>
                <div>
                    <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-foreground leading-none">{data.label || 'Manual Launch'}</h3>
                    <p className="text-[9px] font-bold text-status-green/60 uppercase tracking-tighter mt-1">Intelligence Genesis</p>
                </div>
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!h-3.5 !w-3.5 !border-[4px] !border-status-green !bg-background !transition-all" 
            />
        </div>
    );
};

const nodeTypes = {
    agent: AgentNode,
    trigger: TriggerNode,
};

// --- Custom Agent Selector Dropdown ---

const AgentSelectorDropdown = ({ agents, onAdd, isOpen, onClose }: { agents: AgentMetadata[], onAdd: (agent: AgentMetadata) => void, isOpen: boolean, onClose: () => void }) => {
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const filteredAgents = useMemo(() => {
        if (!search) return agents;
        return agents.filter(a => 
            a.name.toLowerCase().includes(search.toLowerCase()) || 
            a.division.toLowerCase().includes(search.toLowerCase())
        );
    }, [agents, search]);

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
        <div 
            ref={dropdownRef}
            className="absolute top-full right-0 mt-3 w-80 z-[100] flex flex-col rounded-[2.5rem] border border-border bg-card/80 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500"
        >
            <div className="p-6 border-b border-border/40 bg-muted/10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground flex items-center gap-2">
                        <Bot className="h-4 w-4 text-brand-purple" />
                        Agent Catalog
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-foreground/5">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted group-focus-within:text-brand-purple transition-colors" />
                    <input
                        type="text"
                        placeholder="Search for intelligence..."
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-brand-purple/20 transition-all font-semibold placeholder:text-muted/50"
                    />
                </div>
            </div>
            
            <div className="max-h-[420px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {Object.entries(groups).map(([division, items]) => (
                    <div key={division} className="py-2">
                        <h3 className="text-[9px] font-black text-muted/60 uppercase tracking-[0.3em] px-4 mb-3">{division}</h3>
                        <div className="space-y-1.5 px-1">
                            {items.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => {
                                        onAdd(agent);
                                        onClose();
                                    }}
                                    className="w-full text-left p-3.5 rounded-2xl hover:bg-brand-purple/10 border border-transparent hover:border-brand-purple/20 transition-all group flex items-start gap-4"
                                >
                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-background border border-border flex items-center justify-center text-muted group-hover:text-brand-purple group-hover:border-brand-purple/30 group-hover:shadow-lg transition-all">
                                        <Cpu className="h-5 w-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold group-hover:text-brand-purple transition-colors truncate">{agent.name}</p>
                                            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-purple" />
                                        </div>
                                        <p className="text-[10px] text-muted line-clamp-2 mt-1 font-medium leading-relaxed opacity-80">{agent.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                
                {filteredAgents.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-muted p-8">
                        <div className="p-4 rounded-full bg-muted/20 mb-3">
                            <Bot className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">No specialists found</p>
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

    // Node deletion handler
    const onDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }, [setNodes, setEdges]);

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
        return {
            ...n,
            data: {
                ...n.data,
                availableAgents,
                onUpdate: onNodeUpdate,
                onDelete: onDeleteNode,
                id: n.id
            }
        };
    }), [nodes, availableAgents, onNodeUpdate, onDeleteNode]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
        ...params,
        type: 'default',
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '5,5' }
    }, eds)), [setEdges]);

    const handleAddAgent = (agent: AgentMetadata) => {
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
            className="h-full w-full bg-background rounded-[3rem] border border-border/80 overflow-hidden relative shadow-[0_40px_100px_rgba(0,0,0,0.5)] group/canvas"
        >
            <ReactFlow
                nodes={enhancedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-[radial-gradient(#27272a_1.5px,transparent_1.5px)] [background-size:32px_32px]"
            >
                <Background color="#3f3f46" variant="dots" gap={32} />
                <Controls showInteractive={false} className="hidden" />
                
                <MiniMap
                    nodeColor={(n) => {
                        if (n.type === 'trigger') return '#10b981';
                        return '#7c3aed';
                    }}
                    maskColor="rgba(0, 0, 0, 0.4)"
                    className="!bg-card/40 !backdrop-blur-2xl !border-border/60 !rounded-[2rem] !hidden lg:!block !right-8 !bottom-8"
                />

                {/* Floating Toolbar Panel */}
                <Panel position="top-right" className="flex items-center gap-3 p-8">
                    <div className="flex items-center gap-3 rounded-[2rem] border border-border/80 bg-card/60 backdrop-blur-2xl p-2.5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all hover:bg-card/80">
                        {/* Zoom Matrix */}
                        <div className="flex gap-1.5 px-3 border-r border-border/40">
                            <button
                                onClick={() => zoomIn()}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-foreground/5 hover:bg-brand-purple/20 text-muted hover:text-brand-purple transition-all"
                                title="Enlarge Matrix"
                            >
                                <Maximize className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => zoomOut()}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-foreground/5 hover:bg-brand-purple/20 text-muted hover:text-brand-purple transition-all"
                                title="Shrink Matrix"
                            >
                                <Minimize className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => fitView()}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-foreground/5 hover:bg-brand-purple/20 text-muted hover:text-brand-purple transition-all"
                                title="Recenter Genesis"
                            >
                                <Move className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {/* Add Agent Catalog System */}
                        <div className="relative">
                            <button
                                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                                className={cn(
                                    "flex h-11 gap-3 items-center px-6 rounded-[1.25rem] transition-all font-black text-[10px] uppercase tracking-[0.2em] border shadow-lg group/addbtn",
                                    isAgentMenuOpen 
                                        ? "bg-brand-purple text-white border-brand-purple shadow-brand-purple/20" 
                                        : "bg-muted text-foreground border-border/60 hover:border-brand-purple/40 hover:bg-muted/80"
                                )}
                            >
                                <UserPlus className={cn("h-4 w-4 transition-transform group-hover/addbtn:scale-110", isAgentMenuOpen ? "fill-current" : "")} />
                                Forge Agent
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-500", isAgentMenuOpen && "rotate-180")} />
                            </button>
                            
                            <AgentSelectorDropdown 
                                agents={availableAgents} 
                                isOpen={isAgentMenuOpen} 
                                onClose={() => setIsAgentMenuOpen(false)}
                                onAdd={handleAddAgent}
                            />
                        </div>

                        <div className="h-8 w-[1.5px] bg-border/40 mx-1.5" />

                        <button
                            onClick={handleSave}
                            className="flex h-11 gap-3 items-center px-7 rounded-[1.25rem] bg-brand-purple text-white hover:opacity-90 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(124,58,237,0.3)] hover:shadow-brand-purple/40 active:scale-95 group/savebtn"
                        >
                            <Save className="h-4 w-4 fill-current group-hover/savebtn:animate-bounce" />
                            Commit Matrix
                        </button>
                    </div>
                </Panel>

                {/* Intelligence Overview Panel */}
                <Panel position="bottom-left" className="p-8">
                    <div className="flex flex-col gap-4 rounded-[2.5rem] border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-2xl min-w-[240px] transition-all hover:bg-card/80">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/20 shadow-lg">
                                <Layout className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground">Global Registry</h2>
                                <p className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter mt-0.5">Matrix Visualization</p>
                            </div>
                        </div>
                        <div className="space-y-4 mt-4">
                            <div className="flex items-center justify-between group/stat">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-widest group-hover/stat:text-brand-purple transition-colors">Active Specialists</span>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
                                    <span className="text-[12px] font-black font-mono text-foreground">{nodes.filter(n => n.type === 'agent').length}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between group/stat">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-widest group-hover/stat:text-brand-purple transition-colors">Signal Streams</span>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-status-green" />
                                    <span className="text-[12px] font-black font-mono text-foreground">{edges.length}</span>
                                </div>
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
