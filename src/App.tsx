import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  BackgroundVariant,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
  Layout, Typography, Tag, Card, Badge, Button, Drawer, Descriptions,
  Collapse, Timeline, Alert, Space, Divider
} from 'antd';
import {
  CheckCircleFilled, SyncOutlined, CloseCircleFilled,
  ClockCircleOutlined, StopOutlined, ReloadOutlined, RightOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Header, Content } = Layout;
const { Text } = Typography;

// ==========================================
// 1. 类型定义与全局配置
// ==========================================
export interface JobNodeData extends Record<string, unknown> {
  stepId: string;
  jobName: string;
  jobId: string | null;
  status: string;
  attempt: number;
  onRetry: (id: string) => void;
}

const StatusConfig: Record<string, { color: string, hex: string, icon: React.ReactNode }> = {
  Completed: { color: 'success', hex: '#52C41A', icon: <CheckCircleFilled /> },
  Started: { color: 'processing', hex: '#1677FF', icon: <SyncOutlined spin /> },
  Scheduled: { color: 'warning', hex: '#FAAD14', icon: <ClockCircleOutlined /> },
  Failed: { color: 'error', hex: '#FF4D4F', icon: <CloseCircleFilled /> },
  Cancelled: { color: 'default', hex: '#8C8C8C', icon: <StopOutlined /> },
  Ghost: { color: 'default', hex: 'transparent', icon: null },
};

// ==========================================
// 2. 样式组件 (Styled Components)
// ==========================================
const StyledCard = styled(Card)<{ $statusHex: string; $isGhost: boolean }>`
  width: 220px;
  height: 96px;
  border-left: 4px solid ${(props) => props.$statusHex} !important;
  border-style: ${(props) => (props.$isGhost ? 'dashed' : 'solid')} !important;
  background-color: ${(props) => (props.$isGhost ? '#fafafa' : '#ffffff')} !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  
  .ant-card-body {
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
`;

// ==========================================
// 3. 自定义节点组件 (Custom Node)
// ==========================================
const JobCardNode = ({ data }: { data: JobNodeData }) => {
  const { stepId, jobName, jobId, status, attempt, onRetry } = data;
  const config = StatusConfig[status] || StatusConfig.Ghost;
  const isGhost = status === 'Ghost';

  return (
    <Badge count={attempt > 1 ? `↻×${attempt}` : 0} color="red" offset={[-8, 8]}>
      <StyledCard hoverable $statusHex={config.hex} $isGhost={isGhost}>
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        
        {/* Top Row: Step ID & Status Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag style={{ fontFamily: 'monospace', margin: 0, fontSize: 11 }}>{stepId}</Tag>
          {!isGhost && (
            <Tag icon={config.icon} color={config.color} style={{ margin: 0, border: 0 }}>
              {status}
            </Tag>
          )}
        </div>

        {/* Middle Row: Job Name */}
        <Text strong style={{ fontSize: 14, color: isGhost ? '#bfbfbf' : '#333', lineHeight: 1.2 }}>
          {jobName}
        </Text>

        {/* Bottom Row: Job ID & Retry Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isGhost ? (
            <Text italic type="secondary" style={{ fontSize: 11 }}>— not created —</Text>
          ) : (
            <Text style={{ fontFamily: 'monospace', fontSize: 11 }} type="secondary">{jobId}</Text>
          )}

          {status === 'Failed' && jobId && (
            <Button 
              type="primary" danger size="small" icon={<ReloadOutlined />}
              onClick={(e) => { e.stopPropagation(); onRetry(jobId); }}
              style={{ fontSize: 11, padding: '0 8px', height: 22 }}
            >
              Retry
            </Button>
          )}
        </div>

        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      </StyledCard>
    </Badge>
  );
};

const nodeTypes = { customJobCard: JobCardNode };

// ==========================================
// 4. Mock 数据与边样式工厂
// ==========================================
const edgeStyle = (type: 'taken' | 'waiting' | 'dead-condition' | 'dead-predecessor' | 'ghost', labelText: string) => {
  const base = {
    type: 'smoothstep',
    labelStyle: { fill: '#333', fontFamily: 'monospace', fontSize: 11, fontWeight: 500 },
    labelBgPadding: [6, 2] as [number, number],
    labelBgBorderRadius: 4,
  };

  switch (type) {
    case 'taken': return { ...base, animated: false, label: labelText,
      style: { stroke: '#52C41A', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#52C41A' },
      labelBgStyle: { fill: '#fff', stroke: '#52C41A', strokeWidth: 1 }
    };
    case 'waiting': return { ...base, animated: true, label: labelText,
      style: { stroke: '#FAAD14', strokeWidth: 2, opacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#FAAD14' },
      labelBgStyle: { fill: '#fff', stroke: '#FAAD14', strokeWidth: 1 }
    };
    case 'dead-condition': return { ...base, label: `❌ ${labelText}`,
      style: { stroke: '#FF4D4F', strokeWidth: 2, strokeDasharray: '4,4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#FF4D4F' },
      labelStyle: { fill: '#8c8c8c', textDecoration: 'line-through', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#fff', stroke: '#FF4D4F', strokeWidth: 1 }
    };
    case 'dead-predecessor': return { ...base, label: labelText,
      style: { stroke: '#FF4D4F', strokeWidth: 2, strokeDasharray: '4,4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#FF4D4F' },
      labelStyle: { fill: '#bfbfbf', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#fff', stroke: '#FF4D4F', strokeWidth: 1 }
    };
    case 'ghost': return { ...base, label: labelText,
      style: { stroke: '#BFBFBF', strokeWidth: 1, strokeDasharray: '4,4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#BFBFBF' },
      labelStyle: { fill: '#bfbfbf', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#fafafa', stroke: '#BFBFBF', strokeWidth: 1 }
    };
  }
};

const getMockData = (onRetry: (id: string) => void) => {
  const rawNodes = [
    { id: 'T1', data: { stepId: 'T1', jobName: 'BatteryCheck', jobId: 'JOB-47101', status: 'Completed', attempt: 1 } },
    { id: 'T3', data: { stepId: 'T3', jobName: 'Battery 12V Charge', jobId: 'JOB-47102', status: 'Failed', attempt: 2 } },
    { id: 'T4', data: { stepId: 'T4', jobName: 'EV Charging', jobId: 'JOB-47103', status: 'Completed', attempt: 1 } },
    { id: 'T5', data: { stepId: 'T5', jobName: 'Tyre Pressure Check', jobId: 'JOB-47104', status: 'Started', attempt: 1 } },
    { id: 'T6', data: { stepId: 'T6', jobName: 'Tyre Inflate', jobId: null, status: 'Ghost', attempt: 0 } },
  ];

  const nodes: Node[] = rawNodes.map((n) => ({
    id: n.id,
    type: 'customJobCard',
    position: { x: 0, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { ...n.data, onRetry } as JobNodeData
  }));

  const edges: Edge[] = [
    { id: 'E1', source: 'T1', target: 'T3', ...edgeStyle('taken', '12VRequiresCharge == Yes') },
    { id: 'E2', source: 'T1', target: 'T4', ...edgeStyle('taken', 'HVRequiresCharge == Yes') },
    { id: 'E3', source: 'T1', target: 'T5', ...edgeStyle('dead-condition', '12VNo AND HVNo') },
    { id: 'E4', source: 'T3', target: 'T5', ...edgeStyle('dead-predecessor', 'charged == Yes') },
    { id: 'E5', source: 'T4', target: 'T5', ...edgeStyle('waiting', 'charged == Yes') },
    { id: 'E6', source: 'T5', target: 'T6', ...edgeStyle('ghost', 'tyrePressure == Low') },
  ];

  return { nodes, edges };
};

// ==========================================
// 5. Dagre 布局计算引擎
// ==========================================
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 250, nodesep: 40 });

  nodes.forEach((n) => dagreGraph.setNode(n.id, { width: 220, height: 96 }));
  edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
  dagre.layout(dagreGraph);

  nodes.forEach((n) => {
    const nodeWithPos = dagreGraph.node(n.id);
    n.position = { x: nodeWithPos.x - 110, y: nodeWithPos.y - 48 };
  });

  return { nodes, edges };
};

// ==========================================
// 6. 主看板组件 (Dashboard)
// ==========================================
export default function JobChainDashboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobNodeData | null>(null);
  
  const chainStatus = 'Failed'; // 模拟全局链状态

  useEffect(() => {
    const onRetry = (jobId: string) => {
      alert(`Triggered Retry API for Job: ${jobId}`);
    };
    const { nodes: rawNodes, edges: rawEdges } = getMockData(onRetry);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [setNodes, setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedJob(node.data as JobNodeData);
    setDrawerOpen(true);
  };

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Top Header Bar --- */}
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', padding: '0 24px', height: 64, alignItems: 'center' }}>
        <Space size={16}>
          <Text style={{ fontSize: 16, fontWeight: 500 }}>Compound Jobs / Chain #CHN-24891</Text>
          <Divider type="vertical" />
          <Text copyable style={{ fontFamily: 'monospace' }}>WBA5M410X0K000123</Text>
          <Tag color="blue" bordered={false}>BMW</Tag>
          <Tag color="purple" bordered={false}>B07</Tag>
        </Space>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>Started 10:04 · Duration 1h 32m</Text>
          <Tag color={chainStatus === 'Failed' ? 'error' : 'processing'} style={{ margin: 0, border: 0, fontWeight: 600 }}>
            {chainStatus}
          </Tag>
        </Space>
      </Header>

      {/* --- Alert Banner (If Chain Failed) --- */}
      {chainStatus === 'Failed' && (
        <Alert 
          type="error" 
          banner 
          message="Step T3 failed. Retry the failed step to resume the chain." 
          style={{ borderBottom: '1px solid #ffa39e' }}
        />
      )}

      {/* --- Main Canvas --- */}
      <Content style={{ flex: 1, position: 'relative', background: '#FAFAFA' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e8e8e8" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap style={{ border: '1px solid #d9d9d9', borderRadius: 4, width: 180, height: 100 }} position="top-right" zoomable pannable />
        </ReactFlow>

        {/* --- Legend (Bottom Left) --- */}
        <div style={{ position: 'absolute', bottom: 24, left: 24, width: 300 }}>
          <Collapse ghost expandIconPosition="end" size="small" items={[{
            key: '1', label: <Text strong>Legend</Text>,
            children: (
              <Space direction="vertical" size={4} style={{ width: '100%', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <Space><Tag color="success" style={{ border: 0 }}><CheckCircleFilled /></Tag><Text type="secondary">Completed</Text></Space>
                <Space><Tag color="error" style={{ border: 0 }}><CloseCircleFilled /></Tag><Text type="secondary">Failed / Dead</Text></Space>
                <Space><div style={{ width: 24, height: 3, background: '#52C41A' }} /><Text type="secondary">Path Taken</Text></Space>
                <Space><div style={{ width: 24, height: 2, background: '#FF4D4F', borderTop: '2px dashed #FF4D4F' }} /><Text type="secondary">Dead Edge</Text></Space>
              </Space>
            )
          }]} />
        </div>
      </Content>

      {/* --- Right Drawer --- */}
      <Drawer
        title={
          selectedJob ? (
            <Space>
              <Tag style={{ fontFamily: 'monospace' }}>{selectedJob.stepId}</Tag>
              {selectedJob.jobName}
              <Tag color={StatusConfig[selectedJob.status]?.color} bordered={false} style={{ marginLeft: 8 }}>
                {selectedJob.status}
              </Tag>
            </Space>
          ) : 'Job Details'
        }
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button>View JobLog</Button>
            <Button type="primary" ghost>Open in TMS <RightOutlined /></Button>
          </div>
        }
      >
        {selectedJob?.status === 'Failed' && (
          <Button type="primary" danger block icon={<ReloadOutlined />} size="large" style={{ marginBottom: 24 }}>
            Retry this Job
          </Button>
        )}

        {selectedJob && !['Ghost'].includes(selectedJob.status) && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            <Descriptions bordered column={1} size="small" labelStyle={{ width: 120 }}>
              <Descriptions.Item label="Job ID"><Text code>{selectedJob.jobId}</Text></Descriptions.Item>
              <Descriptions.Item label="Started at">2026-04-18 10:32</Descriptions.Item>
              <Descriptions.Item label="Duration">43m</Descriptions.Item>
              <Descriptions.Item label="Location">Killingholme Bay 4</Descriptions.Item>
            </Descriptions>

            <Collapse defaultActiveKey={['1', '2']} ghost items={[
              {
                key: '1',
                label: <Text strong>Edge decisions</Text>,
                children: (
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space direction="vertical">
                      <Text type="secondary">Activated 1 outgoing edge:</Text>
                      <Space>
                        <Tag color="success" bordered={false}>LIVE</Tag>
                        <Text>→ T5 Tyre Pressure Check</Text>
                      </Space>
                      <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>charged == Yes ✓</Text>
                    </Space>
                  </Card>
                )
              },
              {
                key: '2',
                label: <Text strong>Retry history</Text>,
                children: (
                  <Timeline items={[
                    { color: 'red', children: <><Text strong>Attempt 1 — Failed</Text><br/><Text type="secondary">2026-04-18 10:32 · charger unresponsive</Text></> },
                    { color: 'blue', children: <><Text strong>Attempt 2 — {selectedJob.status}</Text><br/><Text type="secondary">2026-04-18 11:15 (current)</Text></> }
                  ]} />
                )
              }
            ]} />
          </Space>
        )}
        
        {selectedJob?.status === 'Ghost' && (
           <Alert message="This step has not materialized yet." type="info" showIcon />
        )}
      </Drawer>

    </Layout>
  );
}