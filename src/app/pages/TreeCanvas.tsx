import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useFamilyContext } from '../context/FamilyContext';
import { PersonNode } from '../components/PersonNode';
import { ProfilePanel } from '../components/ProfilePanel';
import { PersonFormDialog } from '../components/PersonFormDialog';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent } from '../components/ui/sheet';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Home,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { TreeNode, Person } from '../types/family';

export function TreeCanvas() {
  const navigate = useNavigate();
  const { persons, relationships, selectedPerson, setSelectedPerson, currentUserId } = useFamilyContext();
  const [showProfile, setShowProfile] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);

  // Algoritmo de layout exponencial para el árbol
  useEffect(() => {
    const nodes: TreeNode[] = [];
    const levelMap = new Map<string, number>();
    const processedIds = new Set<string>();
    
    // Función recursiva para calcular niveles (generaciones)
    const calculateLevel = (personId: string): number => {
      if (levelMap.has(personId)) return levelMap.get(personId)!;
      
      const parents = relationships
        .filter(r => r.type === 'parent' && r.person2Id === personId)
        .map(r => r.person1Id);
      
      if (parents.length === 0) {
        levelMap.set(personId, 0);
        return 0;
      }
      
      const parentLevels = parents.map(calculateLevel);
      const level = Math.max(...parentLevels) + 1;
      levelMap.set(personId, level);
      return level;
    };
    
    // Calcular niveles para todas las personas
    persons.forEach(p => calculateLevel(p.id));
    
    // Agrupar personas por nivel
    const levelGroups = new Map<number, Person[]>();
    persons.forEach(person => {
      const level = levelMap.get(person.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(person);
    });
    
    // Layout exponencial: cada nivel se expande horizontalmente
    const HORIZONTAL_SPACING = 200; // Espacio entre hermanos
    const VERTICAL_SPACING = 200; // Espacio entre generaciones
    const START_X = 0;
    const START_Y = 100;
    
    // Organizar por familias (mantener parejas juntas)
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const peopleInLevel = levelGroups.get(level) || [];
      const y = START_Y + level * VERTICAL_SPACING;
      
      // Agrupar parejas
      const processed = new Set<string>();
      const groups: Person[][] = [];
      
      peopleInLevel.forEach(person => {
        if (processed.has(person.id)) return;
        
        const spouse = relationships.find(
          r => r.type === 'spouse' && 
          (r.person1Id === person.id || r.person2Id === person.id)
        );
        
        if (spouse) {
          const spouseId = spouse.person1Id === person.id ? spouse.person2Id : spouse.person1Id;
          const spousePerson = persons.find(p => p.id === spouseId);
          
          if (spousePerson && levelMap.get(spousePerson.id) === level) {
            groups.push([person, spousePerson]);
            processed.add(person.id);
            processed.add(spousePerson.id);
            return;
          }
        }
        
        groups.push([person]);
        processed.add(person.id);
      });
      
      // Calcular el ancho total para centrar
      const totalWidth = groups.length * HORIZONTAL_SPACING;
      let currentX = START_X - totalWidth / 2;
      
      groups.forEach(group => {
        if (group.length === 2) {
          // Pareja - colocar juntos
          nodes.push({
            person: group[0],
            x: currentX,
            y,
            level
          });
          nodes.push({
            person: group[1],
            x: currentX + 80,
            y,
            level
          });
          currentX += HORIZONTAL_SPACING;
        } else {
          // Persona individual
          nodes.push({
            person: group[0],
            x: currentX,
            y,
            level
          });
          currentX += HORIZONTAL_SPACING;
        }
      });
    });

    setTreeNodes(nodes);
  }, [persons, relationships]);

  const handlePersonClick = (node: TreeNode) => {
    setSelectedPerson(node.person);
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setSelectedPerson(null);
  };

  const currentUserNode = treeNodes.find(n => n.person.id === currentUserId);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-gray-100"
            >
              <Home className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Árbol Genealógico</h1>
              <p className="text-sm text-gray-600">{persons.length} familiares</p>
            </div>
          </div>
        </div>
      </div>

      {/* Árbol interactivo */}
      <TransformWrapper
        initialScale={0.8}
        minScale={0.3}
        maxScale={2}
        centerOnInit
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controles flotantes */}
            <div className="absolute bottom-8 left-8 z-20 flex flex-col gap-2">
              <Button
                size="icon"
                className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12"
                onClick={() => zoomIn()}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12"
                onClick={() => zoomOut()}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12"
                onClick={() => resetTransform()}
                title="Centrar árbol"
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg h-12 w-12"
                onClick={() => resetTransform()}
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Botón añadir persona */}
            <div className="absolute bottom-8 right-8 z-20">
              <Button
                size="lg"
                className="bg-[#3D6F42] hover:bg-[#2F5233] shadow-lg h-14 w-14 rounded-full"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>

            {/* Canvas del árbol */}
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
                paddingTop: '80px'
              }}
            >
              <div
                className="relative"
                style={{
                  width: '8000px',
                  height: '6000px',
                  transform: 'translate(4000px, 200px)'
                }}
              >
                {/* Líneas de conexión */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  {relationships.map(rel => {
                    const person1Node = treeNodes.find(n => n.person.id === rel.person1Id);
                    const person2Node = treeNodes.find(n => n.person.id === rel.person2Id);

                    if (!person1Node || !person2Node) return null;

                    if (rel.type === 'spouse') {
                      // Línea horizontal para parejas
                      return (
                        <line
                          key={rel.id}
                          x1={person1Node.x + 80}
                          y1={person1Node.y + 40}
                          x2={person2Node.x + 80}
                          y2={person2Node.y + 40}
                          stroke="#3D6F42"
                          strokeWidth="3"
                          strokeDasharray="5,5"
                        />
                      );
                    } else if (rel.type === 'parent') {
                      // Línea vertical para padre-hijo
                      const midY = (person1Node.y + person2Node.y) / 2;
                      return (
                        <g key={rel.id}>
                          <line
                            x1={person1Node.x + 80}
                            y1={person1Node.y + 120}
                            x2={person1Node.x + 80}
                            y2={midY}
                            stroke="#94A3B8"
                            strokeWidth="2"
                          />
                          <line
                            x1={person1Node.x + 80}
                            y1={midY}
                            x2={person2Node.x + 80}
                            y2={midY}
                            stroke="#94A3B8"
                            strokeWidth="2"
                          />
                          <line
                            x1={person2Node.x + 80}
                            y1={midY}
                            x2={person2Node.x + 80}
                            y2={person2Node.y}
                            stroke="#94A3B8"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    }
                    return null;
                  })}
                </svg>

                {/* Nodos de personas */}
                {treeNodes.map(node => (
                  <div
                    key={node.person.id}
                    className="absolute"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      zIndex: 10
                    }}
                  >
                    <PersonNode
                      person={node.person}
                      onClick={() => handlePersonClick(node)}
                      isSelected={selectedPerson?.id === node.person.id}
                    />
                  </div>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Panel lateral de perfil */}
      <Sheet open={showProfile} onOpenChange={setShowProfile}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-hidden">
          {selectedPerson && (
            <ProfilePanel person={selectedPerson} onClose={handleCloseProfile} />
          )}
        </SheetContent>
      </Sheet>

      {/* Diálogo añadir persona */}
      <PersonFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}