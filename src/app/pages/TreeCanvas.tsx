import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { useFamilyContext } from '../context/FamilyContext';
import { PersonNode } from '../components/PersonNode';
import { ProfilePanel } from '../components/ProfilePanel';
import { PersonFormDialog } from '../components/PersonFormDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent } from '../components/ui/sheet';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Home,
  Search,
  X,
  Download,
  Users,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { TreeNode, Person } from '../types/family';

// ─── Constants ────────────────────────────────────────────────────────────────
const H_SPACING = 220;  // horizontal space per node slot
const V_SPACING = 200;  // vertical space between generations
const NODE_W    = 160;  // approximate node card width
const NODE_H    = 120;  // approximate node card height

// ─── Controls helper (must be inside TransformWrapper) ───────────────────────
function ZoomControls({ onExport }: { onExport: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-8 left-8 z-20 flex flex-col gap-2">
      <Button size="icon" className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12" onClick={() => zoomIn()}>
        <ZoomIn className="w-5 h-5" />
      </Button>
      <Button size="icon" className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12" onClick={() => zoomOut()}>
        <ZoomOut className="w-5 h-5" />
      </Button>
      <Button size="icon" className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12" title="Centrar árbol" onClick={() => resetTransform()}>
        <Maximize2 className="w-5 h-5" />
      </Button>
      <Button size="icon" className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12" title="Exportar imagen" onClick={onExport}>
        <Download className="w-5 h-5" />
      </Button>
    </div>
  );
}

// ─── Layout algorithm ─────────────────────────────────────────────────────────
function buildLayout(persons: Person[], relationships: any[]): TreeNode[] {
  if (persons.length === 0) return [];

  // 1. Compute generation level for each person (BFS from roots)
  const parentMap = new Map<string, string[]>(); // child → parents
  const childMap  = new Map<string, string[]>(); // parent → children
  const spouseMap = new Map<string, string>();   // person → spouse

  relationships.forEach(r => {
    if (r.type === 'parent') {
      const children = childMap.get(r.person1Id) ?? [];
      children.push(r.person2Id);
      childMap.set(r.person1Id, children);

      const parents = parentMap.get(r.person2Id) ?? [];
      parents.push(r.person1Id);
      parentMap.set(r.person2Id, parents);
    } else if (r.type === 'spouse') {
      spouseMap.set(r.person1Id, r.person2Id);
      spouseMap.set(r.person2Id, r.person1Id);
    }
  });

  // BFS to assign levels
  const levelMap = new Map<string, number>();
  const roots = persons.filter(p => !parentMap.has(p.id) || parentMap.get(p.id)!.length === 0);

  const queue: { id: string; level: number }[] = roots.map(r => ({ id: r.id, level: 0 }));
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (levelMap.has(id)) continue;
    levelMap.set(id, level);
    (childMap.get(id) ?? []).forEach(childId => {
      if (!levelMap.has(childId)) queue.push({ id: childId, level: level + 1 });
    });
  }
  // Assign any stragglers (disconnected nodes)
  persons.forEach(p => { if (!levelMap.has(p.id)) levelMap.set(p.id, 0); });

  // 2. Group by level, keeping spouses adjacent
  const maxLevel = Math.max(...levelMap.values());
  const nodes: TreeNode[] = [];

  for (let level = 0; level <= maxLevel; level++) {
    const levelPersons = persons.filter(p => levelMap.get(p.id) === level);
    if (levelPersons.length === 0) continue;

    // Build ordered groups: [person, spouse?]
    const visited = new Set<string>();
    const groups: Person[][] = [];
    levelPersons.forEach(p => {
      if (visited.has(p.id)) return;
      visited.add(p.id);
      const spouseId = spouseMap.get(p.id);
      if (spouseId) {
        const spouse = persons.find(s => s.id === spouseId && levelMap.get(s.id) === level);
        if (spouse && !visited.has(spouse.id)) {
          visited.add(spouse.id);
          groups.push([p, spouse]);
          return;
        }
      }
      groups.push([p]);
    });

    // 3. Calculate x positions — centre the whole level around x=0
    // A couple shares one "slot" (they're placed side by side with 90px gap)
    const totalSlots = groups.length;
    const totalWidth = totalSlots * H_SPACING;
    const startX = -totalWidth / 2;
    const y = level * V_SPACING;

    groups.forEach((group, gi) => {
      const slotX = startX + gi * H_SPACING;
      if (group.length === 2) {
        // Couple: left at slotX, right at slotX + 90
        nodes.push({ person: group[0], x: slotX,      y, level });
        nodes.push({ person: group[1], x: slotX + 90, y, level });
      } else {
        nodes.push({ person: group[0], x: slotX + (H_SPACING - NODE_W) / 2, y, level });
      }
    });
  }

  return nodes;
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyTree({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: 80 }}>
      <div className="pointer-events-auto flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#3D6F42]/10 flex items-center justify-center">
          <Users className="w-10 h-10 text-[#3D6F42]/60" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-1">Tu árbol está vacío</h2>
          <p className="text-sm text-gray-500">Añade el primer miembro para comenzar a construir tu historia familiar.</p>
        </div>
        <Button className="bg-[#3D6F42] hover:bg-[#2F5233] gap-2" onClick={onAdd}>
          <UserPlus className="w-4 h-4" />
          Añadir primera persona
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TreeCanvas() {
  const navigate = useNavigate();
  const { persons, relationships, selectedPerson, setSelectedPerson } = useFamilyContext();

  const [showProfile, setShowProfile]     = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [treeNodes, setTreeNodes]         = useState<TreeNode[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchOpen, setSearchOpen]       = useState(false);
  const [highlightId, setHighlightId]     = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Recalculate layout whenever data changes
  useEffect(() => {
    setTreeNodes(buildLayout(persons, relationships));
  }, [persons, relationships]);

  // ── Search ────────────────────────────────────────────────────────────────
  const searchResults = searchQuery.trim()
    ? persons.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.occupation ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.birthPlace ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchSelect = (person: Person) => {
    setHighlightId(person.id);
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedPerson(person);
    setShowProfile(true);
    setTimeout(() => setHighlightId(null), 2000);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      // Dynamically import html2canvas to avoid bundle bloat
      // We'll use a simple SVG-based export since html2canvas isn't in deps
      const svgEl = canvasRef.current?.querySelector('svg');
      if (!svgEl) return;

      // Build a standalone SVG with all node labels
      const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      treeNodes.forEach(n => {
        bounds.minX = Math.min(bounds.minX, n.x);
        bounds.minY = Math.min(bounds.minY, n.y);
        bounds.maxX = Math.max(bounds.maxX, n.x + NODE_W);
        bounds.maxY = Math.max(bounds.maxY, n.y + NODE_H);
      });

      const pad = 60;
      const W = bounds.maxX - bounds.minX + pad * 2;
      const H = bounds.maxY - bounds.minY + pad * 2;
      const ox = pad - bounds.minX;
      const oy = pad - bounds.minY;

      // Build SVG markup
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9fafb"/>
  <style>text { font-family: sans-serif; }</style>`;

      // Lines
      relationships.forEach(rel => {
        const n1 = treeNodes.find(n => n.person.id === rel.person1Id);
        const n2 = treeNodes.find(n => n.person.id === rel.person2Id);
        if (!n1 || !n2) return;
        const x1 = n1.x + NODE_W / 2 + ox;
        const y1 = n1.y + NODE_H / 2 + oy;
        const x2 = n2.x + NODE_W / 2 + ox;
        const y2 = n2.y + NODE_H / 2 + oy;

        if (rel.type === 'spouse') {
          svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3D6F42" stroke-width="2" stroke-dasharray="6,4"/>`;
        } else {
          const midY = (y1 + y2) / 2;
          svgContent += `<polyline points="${x1},${y1} ${x1},${midY} ${x2},${midY} ${x2},${y2}" fill="none" stroke="#94A3B8" stroke-width="2"/>`;
        }
      });

      // Nodes
      treeNodes.forEach(n => {
        const nx = n.x + ox;
        const ny = n.y + oy;
        const birthY = n.person.birthDate ? new Date(n.person.birthDate).getFullYear() : '?';
        const deathY = n.person.deathDate ? `- ${new Date(n.person.deathDate).getFullYear()}` : '';
        svgContent += `
  <rect x="${nx}" y="${ny}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
  <circle cx="${nx + NODE_W / 2}" cy="${ny + 32}" r="22" fill="#3D6F42" opacity="0.15"/>
  <text x="${nx + NODE_W / 2}" y="${ny + 37}" text-anchor="middle" font-size="13" font-weight="600" fill="#1f2937">${n.person.first_name}</text>
  <text x="${nx + NODE_W / 2}" y="${ny + 55}" text-anchor="middle" font-size="11" fill="#6b7280">${n.person.last_name}</text>
  <text x="${nx + NODE_W / 2}" y="${ny + 72}" text-anchor="middle" font-size="10" fill="#9ca3af">${birthY} ${deathY}</text>`;
      });

      svgContent += '</svg>';

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'arbol-familiar.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  }, [treeNodes, relationships]);

  // ── Person interaction ────────────────────────────────────────────────────
  const handlePersonClick = (node: TreeNode) => {
    setSelectedPerson(node.person);
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setSelectedPerson(null);
  };

  // ── Canvas dimensions (computed from nodes) ───────────────────────────────
  const canvasPad = 200;
  const allX = treeNodes.map(n => n.x);
  const allY = treeNodes.map(n => n.y);
  const minX = treeNodes.length ? Math.min(...allX) - canvasPad : -600;
  const minY = treeNodes.length ? Math.min(...allY) - canvasPad : -300;
  const maxX = treeNodes.length ? Math.max(...allX) + NODE_W + canvasPad : 600;
  const maxY = treeNodes.length ? Math.max(...allY) + NODE_H + canvasPad : 300;
  const canvasW = maxX - minX;
  const canvasH = maxY - minY;
  // offset so coordinates map to canvas space
  const ox = -minX;
  const oy = -minY;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-gray-100">
              <Home className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Árbol Genealógico</h1>
              <p className="text-xs text-gray-500">{persons.length} familiares · {Math.max(...treeNodes.map(n => n.level), 0) + (treeNodes.length ? 1 : 0)} generaciones</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    autoFocus
                    className="pl-9 pr-4 w-64 h-9"
                    placeholder="Buscar familiar..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm transition-colors"
                          onClick={() => handleSearchSelect(p)}
                        >
                          <span className="font-medium text-gray-900">{p.first_name} {p.last_name}</span>
                          {p.birthDate && (
                            <span className="text-gray-500 ml-2">{new Date(p.birthDate).getFullYear()}</span>
                          )}
                          {p.occupation && (
                            <span className="text-gray-400 block text-xs">{p.occupation}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-gray-500">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
                <Search className="w-4 h-4 text-gray-600" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {persons.length === 0 && (
        <EmptyTree onAdd={() => setShowAddDialog(true)} />
      )}

      {/* ── Tree canvas ─────────────────────────────────────────────────────── */}
      <TransformWrapper
        initialScale={0.8}
        minScale={0.2}
        maxScale={2.5}
        centerOnInit
        limitToBounds={false}
      >
        <ZoomControls onExport={handleExport} />

        {/* Add person FAB */}
        <div className="absolute bottom-8 right-8 z-20">
          <Button
            size="lg"
            className="bg-[#3D6F42] hover:bg-[#2F5233] shadow-lg h-14 w-14 rounded-full"
            onClick={() => setShowAddDialog(true)}
            title="Añadir persona"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%', paddingTop: '64px' }}
          contentStyle={{ width: `${canvasW}px`, height: `${canvasH}px` }}
        >
          <div ref={canvasRef} style={{ position: 'relative', width: canvasW, height: canvasH }}>

            {/* ── SVG connections (drawn in canvas-local coords) ─────────────── */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1, pointerEvents: 'none' }}
            >
              {relationships.map(rel => {
                const n1 = treeNodes.find(n => n.person.id === rel.person1Id);
                const n2 = treeNodes.find(n => n.person.id === rel.person2Id);
                if (!n1 || !n2) return null;

                // Centre of each node card
                const x1 = n1.x + ox + NODE_W / 2;
                const y1 = n1.y + oy + NODE_H / 2;
                const x2 = n2.x + ox + NODE_W / 2;
                const y2 = n2.y + oy + NODE_H / 2;

                if (rel.type === 'spouse') {
                  return (
                    <line
                      key={rel.id}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#3D6F42" strokeWidth="2.5" strokeDasharray="6,4"
                    />
                  );
                }

                if (rel.type === 'parent') {
                  // From bottom of parent to top of child with elbow routing
                  const px = x1;
                  const py = n1.y + oy + NODE_H;   // bottom of parent card
                  const cy = n2.y + oy;             // top of child card
                  const cx = x2;
                  const midY = py + (cy - py) * 0.5;
                  return (
                    <g key={rel.id}>
                      <line x1={px} y1={py}   x2={px}   y2={midY} stroke="#CBD5E1" strokeWidth="2" />
                      <line x1={px} y1={midY} x2={cx}   y2={midY} stroke="#CBD5E1" strokeWidth="2" />
                      <line x1={cx} y1={midY} x2={cx}   y2={cy}   stroke="#CBD5E1" strokeWidth="2" />
                      <circle cx={cx} cy={cy} r="3" fill="#94A3B8" />
                    </g>
                  );
                }
                return null;
              })}
            </svg>

            {/* ── Person nodes ──────────────────────────────────────────────── */}
            {treeNodes.map(node => (
              <div
                key={node.person.id}
                style={{
                  position: 'absolute',
                  left: node.x + ox,
                  top:  node.y + oy,
                  zIndex: 10,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <div
                  style={{
                    outline: highlightId === node.person.id ? '3px solid #3D6F42' : undefined,
                    borderRadius: 12,
                    animation: highlightId === node.person.id ? 'pulse 1s ease-in-out 2' : undefined,
                  }}
                >
                  <PersonNode
                    person={node.person}
                    onClick={() => handlePersonClick(node)}
                    isSelected={selectedPerson?.id === node.person.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* ── Profile panel ───────────────────────────────────────────────────── */}
      <Sheet open={showProfile} onOpenChange={setShowProfile}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-hidden">
          {selectedPerson && (
            <ProfilePanel person={selectedPerson} onClose={handleCloseProfile} />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add person dialog ────────────────────────────────────────────────── */}
      <PersonFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}