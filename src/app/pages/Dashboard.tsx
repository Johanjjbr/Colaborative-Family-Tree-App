import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useFamilyContext } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { ActivityCard } from '../components/ActivityCard';
import { InviteDialog } from '../components/InviteDialog';
import {
  Network, Users, UserPlus, Calendar, TrendingUp,
  LogOut, Mail, Wifi, WifiOff,
} from 'lucide-react';

// ── Helper: count distinct generations from relationships ─────────────────────
function countGenerations(persons: any[], relationships: any[]): number {
  if (persons.length === 0) return 0;

  const parentMap = new Map<string, string[]>();
  relationships.forEach(r => {
    if (r.type === 'parent') {
      const parents = parentMap.get(r.person2Id) ?? [];
      parents.push(r.person1Id);
      parentMap.set(r.person2Id, parents);
    }
  });

  const levelMap = new Map<string, number>();
  const roots = persons.filter(p => !parentMap.has(p.id) || parentMap.get(p.id)!.length === 0);
  const queue: { id: string; level: number }[] = roots.map(r => ({ id: r.id, level: 0 }));
  const childMap = new Map<string, string[]>();
  relationships.forEach(r => {
    if (r.type === 'parent') {
      const ch = childMap.get(r.person1Id) ?? [];
      ch.push(r.person2Id);
      childMap.set(r.person1Id, ch);
    }
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (levelMap.has(id)) continue;
    levelMap.set(id, level);
    (childMap.get(id) ?? []).forEach(childId => {
      if (!levelMap.has(childId)) queue.push({ id: childId, level: level + 1 });
    });
  }

  if (levelMap.size === 0) return persons.length > 0 ? 1 : 0;
  return Math.max(...levelMap.values()) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    persons, relationships, activities,
    currentUserId, getPersonById, familyName,
    realtimeConnected,
  } = useFamilyContext();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const currentUser = getPersonById(currentUserId);
  const generations = countGenerations(persons, relationships);

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'NA');

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const stats = [
    {
      icon: Users,
      label: 'Familiares',
      value: persons.length,
      color: 'text-[#3D6F42]',
      bgColor: 'bg-[#3D6F42]/10',
    },
    {
      icon: Calendar,
      label: 'Generaciones',
      value: generations,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: TrendingUp,
      label: 'Actividad reciente',
      value: activities.length,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3D6F42] rounded-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{familyName ?? 'Mi Árbol Genealógico'}</h1>
                <p className="text-xs text-gray-500">Descubre y preserva tu historia familiar</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Realtime status badge */}
              <Badge
                variant="outline"
                className={`gap-1.5 text-xs ${realtimeConnected ? 'text-green-700 border-green-300 bg-green-50' : 'text-gray-500 border-gray-300'}`}
              >
                {realtimeConnected
                  ? <><Wifi className="w-3 h-3" /> En vivo</>
                  : <><WifiOff className="w-3 h-3" /> Offline</>
                }
              </Badge>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Card */}
        <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-[#3D6F42] to-[#2F5233] text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Network className="w-64 h-64 transform rotate-12" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-20 h-20 ring-4 ring-white/30">
                <AvatarImage src={currentUser?.photoUrl} />
                <AvatarFallback className="bg-white text-[#3D6F42] text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-1">
                  Bienvenido/a, {user?.firstName ?? user?.email}
                </h2>
                <p className="text-white/80 mb-4 text-sm">
                  Tu árbol tiene{' '}
                  <span className="font-semibold text-white">{persons.length} familiares</span> en{' '}
                  <span className="font-semibold text-white">{generations} generaciones</span>.
                </p>
                <Button
                  size="lg"
                  className="bg-white text-[#3D6F42] hover:bg-gray-100"
                  onClick={() => navigate('/tree')}
                >
                  <Network className="w-5 h-5 mr-2" />
                  Ir a mi Árbol
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent Activity */}
          <Card className="lg:col-span-2 border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Actividad Reciente
                {realtimeConnected && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
              <CardDescription>Últimas actualizaciones en el árbol familiar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {activities.length > 0
                ? activities.slice(0, 6).map(a => <ActivityCard key={a.id} activity={a} />)
                : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No hay actividad todavía.</p>
                    <p className="text-xs text-gray-400 mt-1">Los cambios aparecerán aquí en tiempo real.</p>
                  </div>
                )
              }
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Gestiona tu árbol genealógico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-[#3D6F42] hover:bg-[#2F5233]" onClick={() => navigate('/tree')}>
                <Network className="w-4 h-4 mr-2" />
                Ver Árbol Completo
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/tree')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Añadir Familiar
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setInviteDialogOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Invitar Familia
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="mt-8 border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Colaboración en tiempo real</h3>
                <p className="text-sm text-gray-600">
                  Los cambios de otros miembros aparecen automáticamente en tu árbol sin necesidad de recargar la página.
                  Invita a tus familiares para construir juntos la historia de tu familia.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
    </div>
  );
}