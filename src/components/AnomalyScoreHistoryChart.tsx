import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AnomalyScoreHistoryChartProps {
  data: number[];
  currentScore: number;
  threshold?: number;
  stationName: string;
}

export const AnomalyScoreHistoryChart: React.FC<AnomalyScoreHistoryChartProps> = ({
  data,
  currentScore,
  threshold = 0.35,
  stationName,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const [hoverData, setHoverData] = useState<{
    index: number;
    total: number;
    score: number;
    x: number;
    y: number;
    isFlagged: boolean;
  } | null>(null);

  // Peak score in current window
  const peakScore = data.length > 0 ? Math.max(...data) : currentScore;
  const isCurrentlyFlagged = currentScore > threshold;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = 120; // compact height optimized for sidebar

    const margin = { top: 14, right: 10, bottom: 22, left: 32 };
    const innerWidth = Math.max(20, width - margin.left - margin.right);
    const innerHeight = Math.max(20, height - margin.top - margin.bottom);

    // Ensure data has at least a fallback if empty
    const points: number[] = data && data.length > 0 ? data : [currentScore];

    // Select and clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // Definitions (Gradients & Filters)
    const defs = svg.append('defs');

    // Unique gradient IDs to prevent collisions
    const gradientId = 'anomaly-area-grad';
    const lineGradId = 'anomaly-line-grad';

    const areaGrad = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    // Gradient top color changes to warning amber/red if currently flagged
    if (isCurrentlyFlagged) {
      areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#E0A458').attr('stop-opacity', 0.38);
      areaGrad.append('stop').attr('offset', '40%').attr('stop-color', '#E0A458').attr('stop-opacity', 0.15);
      areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#E0A458').attr('stop-opacity', 0.0);
    } else {
      areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#3FA796').attr('stop-opacity', 0.32);
      areaGrad.append('stop').attr('offset', '50%').attr('stop-color', '#3FA796').attr('stop-opacity', 0.12);
      areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3FA796').attr('stop-opacity', 0.0);
    }

    // Main Chart Group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 1.0])
      .range([innerHeight, 0]);

    // Horizontal Grid Lines
    const gridYValues = [0.0, threshold, 0.7, 1.0];
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(gridYValues)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', (d) => (d === threshold ? 'transparent' : '#28394A'))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6);

    // Threshold Reference Line (at 0.35)
    const thresholdGroup = g.append('g').attr('class', 'threshold-group');

    thresholdGroup
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(threshold))
      .attr('y2', yScale(threshold))
      .attr('stroke', '#E0A458')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.85);

    thresholdGroup
      .append('text')
      .attr('x', innerWidth - 2)
      .attr('y', yScale(threshold) - 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#E0A458')
      .attr('font-size', '8.5px')
      .attr('font-family', "'IBM Plex Sans', monospace")
      .attr('font-weight', '500')
      .text(`Threshold ${threshold}`);

    // D3 Area Generator
    const areaGenerator = d3
      .area<number>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1((d) => yScale(Math.max(0, Math.min(1, d))))
      .curve(d3.curveMonotoneX);

    // D3 Line Generator
    const lineGenerator = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(Math.max(0, Math.min(1, d))))
      .curve(d3.curveMonotoneX);

    // Draw Filled Area
    g.append('path')
      .datum(points)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', areaGenerator);

    // Draw Line
    const strokeColor = isCurrentlyFlagged ? '#E0A458' : '#3FA796';
    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1.8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Highlight latest current data point
    const lastIndex = points.length - 1;
    const lastScore = points[lastIndex];
    const lastX = xScale(lastIndex);
    const lastY = yScale(Math.max(0, Math.min(1, lastScore)));

    // Outer glow / pulse ring on active point
    g.append('circle')
      .attr('cx', lastX)
      .attr('cy', lastY)
      .attr('r', 5.5)
      .attr('fill', strokeColor)
      .attr('fill-opacity', 0.22)
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5);

    // Center active dot
    g.append('circle')
      .attr('cx', lastX)
      .attr('cy', lastY)
      .attr('r', 2.8)
      .attr('fill', strokeColor)
      .attr('stroke', '#0E1620')
      .attr('stroke-width', 1.2);

    // Y-Axis Ticks (0, 0.5, 1.0)
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([0, 0.5, 1.0])
      .tickFormat((d) => `${Math.round(Number(d) * 100)}%`)
      .tickSize(-3);

    const yAxisG = g
      .append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    yAxisG.select('.domain').remove();
    yAxisG.selectAll('.tick line').attr('stroke', '#28394A').attr('stroke-opacity', 0.8);
    yAxisG
      .selectAll('.tick text')
      .attr('fill', '#8298A9')
      .attr('font-size', '8.5px')
      .attr('font-family', "'IBM Plex Sans', monospace")
      .attr('dx', '-3px');

    // X-Axis Ticks (-60t, -30t, Now)
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([0, Math.round((points.length - 1) / 2), points.length - 1])
      .tickFormat((d) => {
        const idx = Number(d);
        const dist = points.length - 1 - idx;
        if (dist === 0) return 'now';
        return `-${dist}t`;
      })
      .tickSize(3);

    const xAxisG = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.select('.domain').attr('stroke', '#28394A').attr('stroke-opacity', 0.8);
    xAxisG.selectAll('.tick line').attr('stroke', '#28394A');
    xAxisG
      .selectAll('.tick text')
      .attr('fill', '#8298A9')
      .attr('font-size', '8.5px')
      .attr('font-family', "'IBM Plex Sans', monospace")
      .attr('dy', '4px');

    // Hover elements group
    const hoverGroup = g.append('g').attr('class', 'hover-group').style('display', 'none');

    const hoverLine = hoverGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#A2B8CC')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-opacity', 0.75);

    const hoverDot = hoverGroup
      .append('circle')
      .attr('r', 3.5)
      .attr('fill', '#E7EDF3')
      .attr('stroke', '#0E1620')
      .attr('stroke-width', 1.5);

    // Interactive Overlay for Tooltip & Hover
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('pointermove', function (event) {
        const [pointerX] = d3.pointer(event);
        const rawIndex = xScale.invert(pointerX);
        const index = Math.max(0, Math.min(points.length - 1, Math.round(rawIndex)));
        const score = points[index];
        const isFlagged = score > threshold;

        const x = xScale(index);
        const y = yScale(Math.max(0, Math.min(1, score)));

        hoverGroup.style('display', null);
        hoverLine.attr('x1', x).attr('x2', x);
        hoverDot.attr('cx', x).attr('cy', y);

        setHoverData({
          index,
          total: points.length,
          score,
          x: x + margin.left,
          y: y + margin.top,
          isFlagged,
        });
      })
      .on('pointerleave', function () {
        hoverGroup.style('display', 'none');
        setHoverData(null);
      });
  }, [data, currentScore, threshold, isCurrentlyFlagged]);

  // Keep responsive on parent container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      // triggers re-render through dummy state if needed or re-renders when data updates
      if (svgRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          svgRef.current.setAttribute('width', `${w}`);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="space-y-1.5" id="tier2-anomaly-score-chart-container">
      {/* Mini Header / Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-[#E7EDF3]">
          <Activity size={12} className={isCurrentlyFlagged ? 'text-[#E0A458]' : 'text-[#3FA796]'} />
          <span className="text-[11.5px] font-semibold tracking-tight">Anomaly Score History</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-[#8298A9]">
            Peak: <span className="text-[#E7EDF3] font-semibold">{Math.round(peakScore * 100)}%</span>
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
              isCurrentlyFlagged
                ? 'bg-[#E0A458]/15 text-[#E0A458] border-[#E0A458]/30'
                : 'bg-[#3FA796]/15 text-[#3FA796] border-[#3FA796]/30'
            }`}
          >
            {isCurrentlyFlagged ? 'FLAGGED' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="w-full relative bg-[#0E1620] border border-[#28394A] rounded p-1 overflow-hidden"
      >
        <svg ref={svgRef} className="w-full block overflow-visible"></svg>

        {/* Dynamic Tooltip */}
        {hoverData && (
          <div
            ref={tooltipRef}
            className="absolute z-20 pointer-events-none bg-[#151F2A]/95 border border-[#28394A] rounded px-2 py-1 shadow-lg text-[10.5px] text-[#E7EDF3] whitespace-nowrap"
            style={{
              left: Math.min(
                Math.max(10, hoverData.x - 45),
                (containerRef.current?.clientWidth || 250) - 110
              ),
              top: Math.max(4, hoverData.y - 38),
            }}
          >
            <div className="flex items-center gap-1 font-mono">
              <span className="text-[#8298A9]">
                {hoverData.total - 1 - hoverData.index === 0
                  ? 'Latest'
                  : `t-${hoverData.total - 1 - hoverData.index}`}
                :
              </span>
              <span className="font-bold text-[#E7EDF3]">
                {Math.round(hoverData.score * 100)}%
              </span>
              <span
                className={`text-[9.5px] font-semibold ${
                  hoverData.isFlagged ? 'text-[#E0A458]' : 'text-[#3FA796]'
                }`}
              >
                ({hoverData.isFlagged ? 'Flag' : 'Pass'})
              </span>
            </div>
            <div className="text-[9px] text-[#8298A9] font-mono">
              Value: {hoverData.score.toFixed(3)} · Threshold: {threshold}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Subtext / Explanation */}
      <div className="flex items-center justify-between text-[10.5px] text-[#8298A9] px-0.5">
        <span>Rolling multivariate Z-score synthesis</span>
        <span className="text-[10px] text-[#63798B] font-mono">Window: {data.length || 60} readings</span>
      </div>
    </div>
  );
};
