import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useFamilyContext } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ActivityCard } from '../components/ActivityCard';
import { InviteDialog } from '../components/InviteDialog';
import { Network, Users, UserPlus, Calendar, TrendingUp, LogOut, Mail } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { persons, activities, currentUserId, getPersonById, familyName } = useFamilyContext();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const currentUser = getPersonById(currentUserId);

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
      bgColor: 'bg-[#3D6F42]/10'
    },
    {
      icon: Calendar,
      label: 'Generaciones',
      value: 4,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: TrendingUp,
      label: 'Actividad reciente',
      value: activities.length,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3D6F42] rounded-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{familyName || 'Mi Árbol Genealógico'}</h1>
                <p className="text-sm text-gray-600">Descubre y preserva tu historia familiar</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-[#3D6F42] to-[#2F5233] text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10">
            <Network className="w-64 h-64 transform rotate-12" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-20 h-20 ring-4 ring-white/30">
                <AvatarImage src={currentUser?.photoUrl} />
                <AvatarFallback className="bg-white text-[#3D6F42] text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">
                  Bienvenido/a, {user?.firstName || user?.email}
                </h2>
                <p className="text-white/90 mb-4">
                  Tu árbol genealógico tiene <span className="font-semibold">{persons.length} familiares</span> registrados
                  a través de <span className="font-semibold">4 generaciones</span>.
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
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
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
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas actualizaciones en el árbol familiar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activities.slice(0, 5).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay actividad reciente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Gestiona tu árbol genealógico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start bg-[#3D6F42] hover:bg-[#2F5233]"
                onClick={() => navigate('/tree')}
              >
                <Network className="w-4 h-4 mr-2" />
                Ver Árbol Completo
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // This would open the add person dialog
                  navigate('/tree');
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Añadir Familiar
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setInviteDialogOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Invitar Familia
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="mt-8 border-none shadow-md bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Consejo para expandir tu árbol</h3>
                <p className="text-sm text-gray-600">
                  Invita a tus familiares a colaborar en el árbol genealógico. Cada persona puede
                  añadir información valiosa y fotos históricas que enriquecerán la historia de tu familia.
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