import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Background,
  Controls,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

// 将你提供的 JSON 数据直接粘贴在这里作为 Mock，实际项目中替换为 fetch 调用
const apiResponse = {
  chain: {
    id: 9001,
    jobChainType: "BmwB07",
    vin: "WBABC12345",
    customerId: 12,
    customerName: "BMW Group",
    subCustomerId: 34,
    subCustomerName: "Killingholme",
    status: "Started",
    statusId: 2,
    templateId: 7,
    templateVersion: 3,
    createdAt: "2026-04-21T08:10:00Z",
    createdBy: "system@vms",
    updatedAt: "2026-04-21T11:45:23Z",
    completedAt: null,
    completedBy: null,
    jobSource: "VMS B07",
    notes: null,
  },
  template: {
    id: 7,
    name: "BmwB07",
    version: 3,
    nodes: [
      {
        id: 701,
        jobTemplateId: 101,
        jobType: "MaintenanceBatteryCheck",
        name: "Battery Check",
        description: null,
        joinPolicy: "AnyLive",
        isStart: true,
        isEnd: false,
      },
      {
        id: 703,
        jobTemplateId: 103,
        jobType: "MaintenanceAddFluids",
        name: "Add Fluids",
        description: null,
        joinPolicy: "AnyLive",
        isStart: false,
        isEnd: false,
      },
      {
        id: 704,
        jobTemplateId: 104,
        jobType: "MaintenanceVehicleWash",
        name: "Vehicle Wash",
        description: null,
        joinPolicy: "AnyLive",
        isStart: false,
        isEnd: false,
      },
      {
        id: 705,
        jobTemplateId: 105,
        jobType: "MaintenanceWarmupEngine",
        name: "Warm Up Engine",
        description: null,
        joinPolicy: "AllLive",
        isStart: false,
        isEnd: false,
      },
      {
        id: 706,
        jobTemplateId: 106,
        jobType: "ReturnInspection",
        name: "Final Inspect",
        description: null,
        joinPolicy: "AnyLive",
        isStart: false,
        isEnd: true,
      },
    ],
    edges: [
      {
        id: 801,
        fromNodeId: 701,
        toNodeId: 703,
        conditions: [
          {
            id: 901,
            name: "BatteryLevel",
            operator: "GreaterOrEqual",
            value: "80",
          },
        ],
      },
      { id: 802, fromNodeId: 701, toNodeId: 704, conditions: [] },
      { id: 803, fromNodeId: 703, toNodeId: 705, conditions: [] },
      { id: 804, fromNodeId: 704, toNodeId: 705, conditions: [] },
      { id: 805, fromNodeId: 705, toNodeId: 706, conditions: [] },
    ],
  },
  jobs: [
    {
      id: 50001,
      templateNodeId: 701,
      jobType: "MaintenanceBatteryCheck",
      status: "Completed",
      statusId: 4,
      locationId: 11,
      externalRef: null,
      notes: null,
      createdAt: "2026-04-21T08:10:05Z",
      createdBy: "system@vms",
      updatedAt: "2026-04-21T08:25:40Z",
      updatedBy: "op.tom",
      completedAt: "2026-04-21T08:25:40Z",
      completedBy: "op.tom",
      supersededByJobId: null,
      attempt: 1,
      extraData: '{"BatteryLevel":85,"Voltage":12.6}',
      triggeredBy: { kind: "ChainCreated", edgeId: null, sourceJobId: null },
    },
    {
      id: 50002,
      templateNodeId: 703,
      jobType: "MaintenanceAddFluids",
      status: "Failed",
      statusId: 5,
      locationId: 11,
      externalRef: null,
      notes: "Coolant leak detected",
      createdAt: "2026-04-21T08:30:00Z",
      createdBy: "system",
      updatedAt: "2026-04-21T09:02:11Z",
      updatedBy: "op.jane",
      completedAt: "2026-04-21T09:02:11Z",
      completedBy: "op.jane",
      supersededByJobId: 50005,
      attempt: 1,
      extraData: '{"FailureReason":"CoolantLeak"}',
      triggeredBy: { kind: "EdgeFired", edgeId: 801, sourceJobId: 50001 },
    },
    {
      id: 50003,
      templateNodeId: 704,
      jobType: "MaintenanceVehicleWash",
      status: "Completed",
      statusId: 4,
      locationId: 11,
      externalRef: null,
      notes: null,
      createdAt: "2026-04-21T08:30:00Z",
      createdBy: "system",
      updatedAt: "2026-04-21T09:15:22Z",
      updatedBy: "op.mike",
      completedAt: "2026-04-21T09:15:22Z",
      completedBy: "op.mike",
      supersededByJobId: null,
      attempt: 1,
      extraData: '{"WashType":"Standard"}',
      triggeredBy: { kind: "EdgeFired", edgeId: 802, sourceJobId: 50001 },
    },
    {
      id: 50005,
      templateNodeId: 703,
      jobType: "MaintenanceAddFluids",
      status: "Started",
      statusId: 2,
      locationId: 11,
      externalRef: null,
      notes: null,
      createdAt: "2026-04-21T11:45:23Z",
      createdBy: "op.jane",
      updatedAt: null,
      updatedBy: null,
      completedAt: null,
      completedBy: null,
      supersededByJobId: null,
      attempt: 2,
      extraData: null,
      triggeredBy: { kind: "Retry", edgeId: null, sourceJobId: 50002 },
    },
  ],
  edgeStates: [
    {
      edgeId: 801,
      state: "Live",
      deadReason: null,
      conditionResults: [
        {
          conditionId: 901,
          met: true,
          actualValue: "85",
          expectedOperator: "GreaterOrEqual",
          expectedValue: "80",
        },
      ],
    },
    { edgeId: 802, state: "Live", deadReason: null, conditionResults: [] },
    { edgeId: 803, state: "Waiting", deadReason: null, conditionResults: null },
    { edgeId: 804, state: "Live", deadReason: null, conditionResults: [] },
    { edgeId: 805, state: "Waiting", deadReason: null, conditionResults: null },
  ],
};

const OperatorMap: Record<string, string> = {
  GreaterOrEqual: ">=",
  GreaterThan: ">",
  LessOrEqual: "<=",
  LessThan: "<",
  Equals: "==",
  NotEquals: "!=",
  Contains: "包含",
  IsNull: "为空",
  IsNotNull: "不为空",
};

// 1. 初始化 Dagre 布局实例
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 50;

// 布局计算函数
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "LR",
) => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};

// 2. 数据适配器：将 API Response 转换为 React Flow 的 Nodes 和 Edges
const generateGraphData = () => {
  const initialNodes: Node[] = apiResponse.template.nodes.map((tNode) => {
    // 找出当前有效任务（忽略已被 superseded 的历史记录）
    const effectiveJob = apiResponse.jobs.find(
      (j) => j.templateNodeId === tNode.id && j.supersededByJobId === null,
    );

    const status = effectiveJob ? effectiveJob.status : "Waiting";

    // 简单的颜色映射，后续可提取为独立组件
    const bgColor =
      status === "Completed"
        ? "#d9f7be"
        : status === "Failed"
          ? "#ffccc7"
          : status === "Started"
            ? "#bae0ff"
            : "#f5f5f5";

    return {
      id: tNode.id.toString(),
      sourcePosition: Position.Right, // <-- 新增：线条从右侧出去
      targetPosition: Position.Left, // <-- 新增：线条从左侧进入
      position: { x: 0, y: 0 }, // 初始坐标设为 0，交由 dagre 计算
      data: {
        label: `${tNode.name}\n(${status})`,
      },
      style: {
        background: bgColor,
        border: "1px solid #d9d9d9",
        borderRadius: "8px",
        width: nodeWidth,
        textAlign: "center",
        fontWeight: "bold",
      },
    };
  });

  const initialEdges: Edge[] = apiResponse.template.edges.map((tEdge) => {
    const stateRow = apiResponse.edgeStates.find((e) => e.edgeId === tEdge.id);
    const isLive = stateRow?.state === "Live";
    const isDead = stateRow?.state === "Dead";

    // 组装要在连线上显示的 Label 文本
    let edgeLabel: string | undefined = undefined;

    if (stateRow?.conditionResults && stateRow.conditionResults.length > 0) {
      // 遍历运行结果，并从模板中找出对应的条件名
      edgeLabel = stateRow.conditionResults
        .map((cr) => {
          const templateCondition = tEdge.conditions?.find(
            (c) => c.id === cr.conditionId,
          );
          const conditionName = templateCondition
            ? templateCondition.name
            : "Unknown";

          const opSymbol =
            OperatorMap[cr.expectedOperator] || cr.expectedOperator;
          const actual = cr.actualValue !== null ? cr.actualValue : "null";

          // 拼接格式：BatteryLevel: 85 (>= 80)
          return `${conditionName}: ${actual} (${opSymbol} ${cr.expectedValue})`;
        })
        .join("\n"); // 如果有多个条件，用换行符连接
    }

    return {
      id: tEdge.id.toString(),
      source: tEdge.fromNodeId.toString(),
      target: tEdge.toNodeId.toString(),
      type: "smoothstep",
      animated: isLive,
      // ---- 新增的 Label 相关配置 ----
      label: edgeLabel,
      labelStyle: {
        fill: isDead ? "#bfbfbf" : "#333", // 如果是死边，文字变灰
        fontWeight: 600,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: "#ffffff",
        stroke: isDead ? "#d9d9d9" : "#91caff", // 背景边框颜色
        strokeWidth: 1,
        rx: 4, // 背景圆角
        ry: 4, // 背景圆角
      },
      labelBgPadding: [8, 4], // Label 内边距 [水平, 垂直]
      labelShowBg: true,
      // -----------------------------
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDead ? "#d9d9d9" : "#1890ff",
      },
      style: {
        stroke: isDead ? "#d9d9d9" : "#1890ff",
        strokeWidth: 2,
        strokeDasharray: isDead ? "5,5" : "none",
      },
    };
  });

  return { initialNodes, initialEdges };
};

// 3. 主渲染组件
export default function JobChainDagView() {
  const { initialNodes, initialEdges } = generateGraphData();
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges,
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  return (
    <div
      style={{ width: "100vw", height: "100vh", backgroundColor: "#fcfcfc" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
