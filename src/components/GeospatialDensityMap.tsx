import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Customer } from '../types/index.js';
import { MapPin, Globe, RefreshCcw } from 'lucide-react';

// Deterministic region resolver based on customer profiles
export function getCustomerRegion(customer: Customer): string {
  if (customer.phone.startsWith('+1') || customer.email.endsWith('.com') && customer.id === 'c2') {
    return 'North America';
  }
  const lastChar = customer.id.slice(-1);
  if (lastChar === '1' || lastChar === '6') return 'West India (Mumbai)';
  if (lastChar === '2' || lastChar === '7') return 'South India (Bengaluru)';
  if (lastChar === '3' || lastChar === '8') return 'North India (Delhi NCR)';
  if (lastChar === '4' || lastChar === '9') return 'East India (Kolkata)';
  return 'Central India (Indore)';
}

interface GeospatialDensityMapProps {
  customers: Customer[];
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
}

interface HubData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

const REGIONAL_HUBS: HubData[] = [
  { id: 'North India (Delhi NCR)', name: 'North Hub (Delhi NCR)', x: 300, y: 90, color: '#FF4500' },
  { id: 'West India (Mumbai)', name: 'West Hub (Mumbai)', x: 260, y: 200, color: '#FF8C00' },
  { id: 'South India (Bengaluru)', name: 'South Hub (Bengaluru)', x: 290, y: 290, color: '#38BDF8' },
  { id: 'East India (Kolkata)', name: 'East Hub (Kolkata)', x: 390, y: 170, color: '#10B981' },
  { id: 'North America', name: 'Global Hub (California)', x: 90, y: 150, color: '#A855F7' }
];

export default function GeospatialDensityMap({ customers, selectedRegion, onSelectRegion }: GeospatialDensityMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Map state calculations
  const regionCounts = REGIONAL_HUBS.reduce((acc, hub) => {
    acc[hub.id] = 0;
    return acc;
  }, {} as Record<string, number>);

  customers.forEach(c => {
    const r = getCustomerRegion(c);
    if (r in regionCounts) {
      regionCounts[r]++;
    } else {
      // Default fallback
      const match = REGIONAL_HUBS.find(h => r.includes(h.id) || h.id.includes(r));
      if (match) regionCounts[match.id]++;
    }
  });

  const totalSegmentCustomers = customers.length;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 500;
    const height = 360;

    // Remove any previously rendered transient selections
    svg.selectAll('.d3-dynamic').remove();

    // Bind Hub data
    const nodes = REGIONAL_HUBS.map(hub => {
      const count = regionCounts[hub.id] || 0;
      const density = totalSegmentCustomers > 0 ? count / totalSegmentCustomers : 0;
      return {
        ...hub,
        count,
        density
      };
    });

    // 1. Draw dashed grid background lines using D3
    const gridLinesX = d3.range(50, width, 50);
    svg.append('g')
      .attr('class', 'd3-dynamic opacity-10')
      .selectAll('line')
      .data(gridLinesX)
      .enter()
      .append('line')
      .attr('x1', d => d)
      .attr('y1', 20)
      .attr('x2', d => d)
      .attr('y2', height - 20)
      .attr('stroke', '#a1a1aa')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');

    const gridLinesY = d3.range(40, height, 40);
    svg.append('g')
      .attr('class', 'd3-dynamic opacity-10')
      .selectAll('line')
      .data(gridLinesY)
      .enter()
      .append('line')
      .attr('x1', 20)
      .attr('y1', d => d)
      .attr('x2', width - 20)
      .attr('y2', d => d)
      .attr('stroke', '#a1a1aa')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');

    // 2. Draw pathways connecting global hub to domestic Indian hubs
    const links = [
      { source: nodes[4], target: nodes[0] }, // California to Delhi
      { source: nodes[4], target: nodes[1] }, // California to Mumbai
      { source: nodes[1], target: nodes[2] }, // Mumbai to Bengaluru
      { source: nodes[0], target: nodes[3] }, // Delhi to Kolkata
      { source: nodes[2], target: nodes[3] }  // Bengaluru to Kolkata
    ];

    svg.append('g')
      .attr('class', 'd3-dynamic')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // curved arc pathways
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.08)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');

    // 3. Render animated radar rings and hub circles using D3 enter/update/exit pattern
    const hubGroups = svg.append('g')
      .attr('class', 'd3-dynamic')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer group')
      .on('click', (event, d) => {
        if (selectedRegion === d.id) {
          onSelectRegion(null); // Deselect
        } else {
          onSelectRegion(d.id);
        }
      });

    // Outer radar glow bubble (D3 data-driven attributes with transition)
    hubGroups.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 10) // Start small
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.12)
      .attr('stroke', d => d.color)
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1)
      .transition()
      .duration(1000)
      .attr('r', d => {
        // Radius scale: min 14, max 50 based on density
        return 14 + (d.density * 55);
      });

    // Core hub markers
    hubGroups.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 5)
      .attr('fill', d => d.color)
      .attr('stroke', '#120a0a')
      .attr('stroke-width', 2)
      .transition()
      .duration(600)
      .attr('r', d => {
        // Highlight active filter selection slightly larger
        return selectedRegion === d.id ? 8 : 6;
      });

    // Dynamic numeric count values floating inside SVG
    hubGroups.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'var(--font-mono)')
      .text(d => d.count || '0');

    // Hover tooltip / text label below elements
    hubGroups.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', d => selectedRegion === d.id ? '#FF4500' : 'rgba(255, 255, 255, 0.45)')
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .attr('font-family', 'sans-serif')
      .attr('letter-spacing', '0.05em')
      .text(d => d.name.toUpperCase());

  }, [regionCounts, selectedRegion, totalSegmentCustomers]);

  return (
    <div className="bg-[#120a0a]/50 p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col xl:flex-row gap-6">
      {/* Visual map dashboard viewport */}
      <div className="flex-1 min-w-[280px] bg-black/60 rounded-xl border border-white/5 p-4 flex items-center justify-center relative">
        <div className="absolute top-4 left-4 flex items-center gap-1.5 pointer-events-none select-none">
          <Globe className="w-3.5 h-3.5 text-[#FF4500]" />
          <span className="text-[10px] font-bold font-mono text-stone-300 tracking-wider uppercase">Active Geographic Grid</span>
        </div>
        
        {/* Responsive raw SVG */}
        <svg 
          ref={svgRef} 
          viewBox="0 0 500 360" 
          width="100%" 
          height="100%" 
          className="max-h-[300px] select-none"
        />
      </div>

      {/* Region index card and selector metrics */}
      <div className="w-full xl:w-[260px] flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-[#FF4500] font-mono tracking-widest px-2 py-0.5 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded">D3.js Core</span>
            <h3 className="text-xs font-bold text-stone-200 tracking-wider">REGIONAL CONCENTRATION</h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1 leading-normal">
            Real-time demographic mapping of local shopper density. Click on map node hubs to focus directory listings instantly.
          </p>
        </div>

        {/* Dynamic list displaying the current breakdown counts */}
        <div className="space-y-1.5 flex-1 py-1">
          {REGIONAL_HUBS.map(hub => {
            const count = regionCounts[hub.id] || 0;
            const percentage = totalSegmentCustomers > 0 ? Math.round((count / totalSegmentCustomers) * 100) : 0;
            const isSelected = selectedRegion === hub.id;

            return (
              <button
                key={hub.id}
                onClick={() => onSelectRegion(isSelected ? null : hub.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left text-[11px] ${
                  isSelected 
                    ? 'bg-[#FF4500]/10 border-[#FF4500] text-white font-bold' 
                    : 'bg-white/2 border-white/4 hover:bg-white/4 text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hub.color }} />
                  <span className="truncate">{hub.id}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono shrink-0">
                  <span className="font-semibold text-white">{count}</span>
                  <span className="text-stone-500 text-[10px]">({percentage}%)</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clear buttons and legend info */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Mapped footprint
          </span>
          {selectedRegion && (
            <button
              onClick={() => onSelectRegion(null)}
              className="flex items-center gap-1 text-[9px] text-orange-400 hover:text-orange-300 transition-colors font-mono font-bold"
            >
              <RefreshCcw className="w-2.5 h-2.5" /> Clear Region Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
