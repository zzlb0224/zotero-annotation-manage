import * as d3 from 'd3';  
  
interface Node extends d3.SimulationNodeDatum {  
  id: string;  
  children?: Node[];  
}  
  
interface Link extends d3.SimulationNodeDatum  {  
  source: string;  
  target: string;  
}  
  
class ForceDirectedTree {  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined>;  
  private simulation!: d3.Simulation<Node, Link>;  
  private nodes: Node[];  
  private links: Link[];  
   private linkGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private  nodeGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  
  constructor(svg: d3.Selection<SVGGElement, unknown, null, undefined>) {  
    this.svg = svg;  
    this.nodes = [];  
    this.links = [];  
    this.initSimulation();  
    this.initGroups();  
  }  
  
  private initSimulation() {  
    const simulation = d3.forceSimulation(this.nodes)  
      .force("link", d3.forceLink(this.links).id(d => d.id))  
      .force("charge", d3.forceManyBody())  
      .force("center", d3.forceCenter(this.svg.node()!.getBoundingClientRect().width / 2, this.svg.node()!.getBoundingClientRect().height / 2));  
  
    this.simulation = simulation;  
  }  
  
  public addNode(node: Node) {  
    this.nodes.push(node);  
    this.simulation.nodes(this.nodes);  
    this.simulation.alphaTarget(0.3).restart();  
    // 这里应该添加节点渲染的逻辑  
  }  
  
  public removeNode(id: string) {  
    const index = this.nodes.findIndex(node => node.id === id);  
    if (index !== -1) {  
      this.nodes.splice(index, 1);  
      this.simulation.nodes(this.nodes);  
      this.simulation.alphaTarget(0.3).restart();  
      // 这里应该添加节点移除的逻辑  
    }  
  }  
  
  public addLink(link: Link) {  
    this.links.push(link);  
    this.simulation.force("link", d3.forceLink(this.links).id(d => d.id));  
    this.simulation.alphaTarget(0.3).restart();  
    // 这里应该添加连线渲染的逻辑  
  }  
  
  public removeLink(source: string, target: string) {  
    const index = this.links.findIndex(l => l.source === source && l.target === target);  
    if (index !== -1) {  
      this.links.splice(index, 1);  
      this.simulation.force("link", d3.forceLink(this.links).id(d => d.id));  
      this.simulation.alphaTarget(0.3).restart();  
      // 这里应该添加连线移除的逻辑  
    }  
  }  
  private initGroups() {  
    this.nodeGroup = this.svg.append('g').attr('class', 'nodes');  
    this.linkGroup = this.svg.append('g').attr('class', 'links');  
  }  
  
  private drawNodes() {  
    const node = this.nodeGroup.selectAll('.node')  
      .data(this.nodes, d => d.id);  
  
    node.exit().remove();  
  
    const newNode = node.enter().append('circle')  
      .attr('class', 'node')  
      .attr('r', 5)  
      .attr('fill', '#69b3a2')  
      .call(d3.drag()  
        .on('start', this.dragStarted.bind(this))  
        .on('drag', this.dragged.bind(this))  
        .on('end', this.dragEnded.bind(this)));  
  
    node = newNode.merge(node);  
  
    this.simulation.nodes(this.nodes);  
    this.simulation.alphaTarget(0.3).restart();  
  }  
  
  private drawLinks() {  
    const link = this.linkGroup.selectAll('.link')  
      .data(this.links, d => `${d.source}-${d.target}`);  
  
    link.exit().remove();  
  
    link.enter().append('line')  
      .attr('class', 'link')  
      .style('stroke', '#9ecae1');  
  }  
  
  private dragStarted(event, d) {  
    if (!event.active) this.simulation.alphaTarget(0.3).restart();  
    d.fx = d.x;  
    d.fy = d.y;  
  }  
  
  private dragged(event, d) {  
    d.fx = event.x;  
    d.fy = event.y;  
  }  
  
  private dragEnded(event, d) {  
    if (!event.active) this.simulation.alphaTarget(0);  
    d.fx = null;  
    d.fy = null;  
  }  
  
  public ticked() {  
    this.linkGroup.selectAll('.link')  
      .attr('x1', d => d.source.x)  
      .attr('y1', d => d.source.y)  
      .attr('x2', d => d.target.x)  
      .attr('y2', d => d.target.y);  
  
    this.nodeGroup.selectAll('.node')  
      .attr('cx', d => d.x)  
      .attr('cy', d => d.y);  
  }   
}