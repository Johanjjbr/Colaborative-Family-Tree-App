import { Person, Relationship, Activity } from '../types/family';

export const mockPersons: Person[] = [
  // Nivel 0 - Bisabuelos
  {
    id: '1',
    firstName: 'Antonio',
    lastName: 'García',
    birthDate: '1920-03-15',
    deathDate: '1998-07-22',
    birthPlace: 'Madrid, España',
    occupation: 'Carpintero',
    biography: 'Fundador de la familia García en España.',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '2',
    firstName: 'María',
    lastName: 'López',
    birthDate: '1922-06-10',
    deathDate: '2005-11-30',
    birthPlace: 'Sevilla, España',
    occupation: 'Maestra',
    photoUrl: '',
    gender: 'female'
  },
  {
    id: '3',
    firstName: 'José',
    lastName: 'Martínez',
    birthDate: '1918-01-08',
    deathDate: '1995-04-12',
    birthPlace: 'Barcelona, España',
    occupation: 'Comerciante',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '4',
    firstName: 'Carmen',
    lastName: 'Rodríguez',
    birthDate: '1921-09-25',
    deathDate: '2000-08-17',
    birthPlace: 'Valencia, España',
    occupation: 'Ama de casa',
    photoUrl: '',
    gender: 'female'
  },
  // Nivel 1 - Abuelos
  {
    id: '5',
    firstName: 'Francisco',
    lastName: 'García',
    birthDate: '1945-02-14',
    deathDate: '2015-12-05',
    birthPlace: 'Madrid, España',
    occupation: 'Ingeniero',
    biography: 'Primer ingeniero de la familia, trabajó en construcción de puentes.',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '6',
    firstName: 'Isabel',
    lastName: 'Martínez',
    birthDate: '1948-07-20',
    birthPlace: 'Barcelona, España',
    occupation: 'Enfermera',
    photoUrl: '',
    gender: 'female'
  },
  {
    id: '7',
    firstName: 'Pedro',
    lastName: 'Hernández',
    birthDate: '1943-11-03',
    deathDate: '2018-03-22',
    birthPlace: 'Granada, España',
    occupation: 'Médico',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '8',
    firstName: 'Ana',
    lastName: 'Sánchez',
    birthDate: '1946-05-18',
    birthPlace: 'Málaga, España',
    occupation: 'Profesora',
    photoUrl: '',
    gender: 'female'
  },
  // Nivel 2 - Padres
  {
    id: '9',
    firstName: 'Carlos',
    lastName: 'García',
    birthDate: '1972-04-10',
    birthPlace: 'Madrid, España',
    occupation: 'Arquitecto',
    biography: 'Especialista en diseño sostenible, ha trabajado en proyectos internacionales.',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '10',
    firstName: 'Laura',
    lastName: 'Hernández',
    birthDate: '1975-09-05',
    birthPlace: 'Granada, España',
    occupation: 'Diseñadora Gráfica',
    photoUrl: '',
    gender: 'female'
  },
  {
    id: '11',
    firstName: 'Miguel',
    lastName: 'García',
    birthDate: '1970-01-22',
    birthPlace: 'Madrid, España',
    occupation: 'Abogado',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '12',
    firstName: 'Elena',
    lastName: 'Torres',
    birthDate: '1973-08-30',
    birthPlace: 'Zaragoza, España',
    occupation: 'Psicóloga',
    photoUrl: '',
    gender: 'female'
  },
  // Nivel 3 - Generación actual (tu generación)
  {
    id: '13',
    firstName: 'Sofía',
    lastName: 'García',
    birthDate: '1998-06-15',
    birthPlace: 'Madrid, España',
    occupation: 'Ingeniera de Software',
    biography: 'Especializada en desarrollo web y diseño de interfaces.',
    photoUrl: '',
    gender: 'female'
  },
  {
    id: '14',
    firstName: 'David',
    lastName: 'García',
    birthDate: '2000-11-28',
    birthPlace: 'Madrid, España',
    occupation: 'Estudiante de Medicina',
    photoUrl: '',
    gender: 'male'
  },
  {
    id: '15',
    firstName: 'Andrea',
    lastName: 'García',
    birthDate: '1995-03-12',
    birthPlace: 'Madrid, España',
    occupation: 'Fotógrafa',
    photoUrl: '',
    gender: 'female'
  },
  {
    id: '16',
    firstName: 'Pablo',
    lastName: 'García',
    birthDate: '1997-07-08',
    birthPlace: 'Madrid, España',
    occupation: 'Músico',
    photoUrl: '',
    gender: 'male'
  }
];

export const mockRelationships: Relationship[] = [
  // Relaciones de pareja - Bisabuelos
  { id: 'r1', type: 'spouse', person1Id: '1', person2Id: '2' },
  { id: 'r2', type: 'spouse', person1Id: '3', person2Id: '4' },
  
  // Relaciones de pareja - Abuelos
  { id: 'r3', type: 'spouse', person1Id: '5', person2Id: '6' },
  { id: 'r4', type: 'spouse', person1Id: '7', person2Id: '8' },
  
  // Relaciones de pareja - Padres
  { id: 'r5', type: 'spouse', person1Id: '9', person2Id: '10' },
  { id: 'r6', type: 'spouse', person1Id: '11', person2Id: '12' },
  
  // Relaciones padre-hijo
  // Antonio y María -> Francisco
  { id: 'r7', type: 'parent', person1Id: '1', person2Id: '5' },
  { id: 'r8', type: 'parent', person1Id: '2', person2Id: '5' },
  
  // José y Carmen -> Isabel
  { id: 'r9', type: 'parent', person1Id: '3', person2Id: '6' },
  { id: 'r10', type: 'parent', person1Id: '4', person2Id: '6' },
  
  // Padres de Pedro (abuelo 7)
  { id: 'r11', type: 'parent', person1Id: '1', person2Id: '7' },
  { id: 'r12', type: 'parent', person1Id: '2', person2Id: '7' },
  
  // Padres de Ana (abuela 8)
  { id: 'r13', type: 'parent', person1Id: '3', person2Id: '8' },
  { id: 'r14', type: 'parent', person1Id: '4', person2Id: '8' },
  
  // Francisco e Isabel -> Carlos y Miguel
  { id: 'r15', type: 'parent', person1Id: '5', person2Id: '9' },
  { id: 'r16', type: 'parent', person1Id: '6', person2Id: '9' },
  { id: 'r17', type: 'parent', person1Id: '5', person2Id: '11' },
  { id: 'r18', type: 'parent', person1Id: '6', person2Id: '11' },
  
  // Pedro y Ana -> Laura
  { id: 'r19', type: 'parent', person1Id: '7', person2Id: '10' },
  { id: 'r20', type: 'parent', person1Id: '8', person2Id: '10' },
  
  // Carlos y Laura -> Sofía y David
  { id: 'r21', type: 'parent', person1Id: '9', person2Id: '13' },
  { id: 'r22', type: 'parent', person1Id: '10', person2Id: '13' },
  { id: 'r23', type: 'parent', person1Id: '9', person2Id: '14' },
  { id: 'r24', type: 'parent', person1Id: '10', person2Id: '14' },
  
  // Miguel y Elena -> Andrea y Pablo
  { id: 'r25', type: 'parent', person1Id: '11', person2Id: '15' },
  { id: 'r26', type: 'parent', person1Id: '12', person2Id: '15' },
  { id: 'r27', type: 'parent', person1Id: '11', person2Id: '16' },
  { id: 'r28', type: 'parent', person1Id: '12', person2Id: '16' }
];

export const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'added_person',
    userId: 'user1',
    userName: 'Carlos García',
    targetPersonName: 'Antonio García',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a2',
    type: 'updated_person',
    userId: 'user2',
    userName: 'Laura Hernández',
    targetPersonName: 'María López',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a3',
    type: 'added_person',
    userId: 'user3',
    userName: 'Sofía García',
    targetPersonName: 'Carmen Rodríguez',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a4',
    type: 'added_relationship',
    userId: 'user1',
    userName: 'Carlos García',
    targetPersonName: 'Francisco García y Isabel Martínez',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const currentUserId = '13'; // Sofía García
