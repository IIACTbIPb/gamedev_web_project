export interface StaticObjectData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface HouseData extends StaticObjectData {
  wallColor?: string; // Делаем опциональным, чтобы старые дома не сломались
}

export interface TreeData extends StaticObjectData {
  leafColor?: string; // Цвет листвы (Опционально)
}

// Твоя карта! Сюда ты будешь вставлять координаты.
export const LEVEL_01 = {
  trees: [
    { id: 'tree_1', position: [5.2, 0, -3.1], rotation: [0, 1.2, 0], scale: [1, 1, 1], leafColor: '#ffffff' }, // Обычное (оригинальный цвет модели)
    { id: 'tree_2', position: [8.0, 0, -8.5], rotation: [0, 0.5, 0], scale: [1.2, 1.2, 1.2], leafColor: '#aaffaa' }, // Светло-зеленое (весеннее)
    { id: 'tree_449', position: [-4.20, 0, 13.64], rotation: [0, 2.04, 0], scale: [1.03, 1.03, 1.03], leafColor: '#ffaaaa' },
    { id: 'tree_134', position: [0.19, 0, 9.45], rotation: [0, 4.51, 0], scale: [1.02, 1.02, 1.02], leafColor: '#aaffaa' },
    { id: 'tree_33', position: [1.56, 0, 16.55], rotation: [0, 2.09, 0], scale: [1.16, 1.16, 1.16], leafColor: '#aaffaa' },
    { id: 'tree_709', position: [-31.50, 0, 14.99], rotation: [0, 3.88, 0], scale: [0.83, 0.83, 0.83] },
    { id: 'tree_153', position: [-35.62, 0, -4.32], rotation: [0, 5.00, 0], scale: [0.91, 0.91, 0.91], leafColor: '#ffddaa' },
    { id: 'tree_168', position: [-39.63, 0, -14.62], rotation: [0, 0.31, 0], scale: [0.93, 0.93, 0.93], leafColor: '#96c10a' },
    { id: 'tree_78', position: [-27.81, 0, -13.20], rotation: [0, 5.91, 0], scale: [1.19, 1.19, 1.19] },
    { id: 'tree_406', position: [-33.71, 0, 7.33], rotation: [0, 4.97, 0], scale: [0.83, 0.83, 0.83], leafColor: '#ffaaaa' },
    { id: 'tree_770', position: [16.84, 0, 7.56], rotation: [0, 3.88, 0], scale: [1.18, 1.18, 1.18], leafColor: '#aaffaa' },
    { id: 'tree_336', position: [21.71, 0, -7.42], rotation: [0, 3.90, 0], scale: [1.13, 1.13, 1.13], leafColor: '#0593e0' },
  ] as TreeData[],

  houses: [
    { id: 'house_1', position: [-30, 0, -40], rotation: [0, 0.5, 0], scale: [2.5, 2.5, 2.5], wallColor: '#ffffff' },
    { id: 'house_2', position: [-40, 0, -25], rotation: [0, 1.5, 0], scale: [2, 2, 2], wallColor: '#ffcccc' }, // Слегка красный кирпич/дерево
    { id: 'house_3', position: [-10, 0, -40], rotation: [0, -0.5, 0], scale: [2, 2, 2], wallColor: '#ccffcc' }, // Зеленоватый оттенок
    { id: 'house_4', position: [-15, 0, 20], rotation: [0, 3.2, 0], scale: [3, 3, 3], wallColor: '#f50404ff' }, // Зеленоватый оттенок
  ] as HouseData[],
};