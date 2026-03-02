import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ExerciseSeed = {
  name: string;
  muscleGroup?: string;
  defaultSets?: number;
};

type TemplateSeed = {
  name: string;
  orderIndex: number;
  exercises: Array<{ name: string; enabled?: boolean }>;
};

const exercises: ExerciseSeed[] = [
  { name: "Жим лежа", muscleGroup: "Грудь" },
  { name: "Жим от груди сидя в тренажере", muscleGroup: "Грудь" },
  { name: "Тренажер Скота", muscleGroup: "Бицепс" },
  { name: "Подъемы на бицепс в кроссовере", muscleGroup: "Бицепс" },
  { name: "Вертикальный жим сидя в тренажере", muscleGroup: "Плечи" },
  { name: "Подъемы ног в висе", muscleGroup: "Пресс" },
  { name: "Подъемы ног лежа", muscleGroup: "Пресс" },
  { name: "Скручивания на скамье", muscleGroup: "Пресс" },
  { name: "Тяга верхнего блока", muscleGroup: "Спина" },
  { name: "Тяга вертикального блока", muscleGroup: "Спина" },
  { name: "Тяга в тренажере с упором в грудь", muscleGroup: "Спина" },
  { name: "Гиперэкстензия", muscleGroup: "Спина" },
  { name: "Разгибание на блоке из-за головы", muscleGroup: "Трицепс" },
  { name: "Разгибание рук на блоке с канатной рукоятью", muscleGroup: "Трицепс" },
  { name: "Тренажёр рычажный на трицепс сидя", muscleGroup: "Трицепс" },
  { name: "Жим платформы ногами", muscleGroup: "Ноги" },
  { name: "Приседания в тренажере", muscleGroup: "Ноги" },
  { name: "Сведение ног в тренажере", muscleGroup: "Ноги" },
  { name: "Разведение ног в тренажере", muscleGroup: "Ноги" },
  { name: "Разгибание ног сидя в тренажере", muscleGroup: "Ноги" },
  { name: "Сгибание ног в тренажере лежа", muscleGroup: "Ноги" },
  { name: "Тренажер для икр", muscleGroup: "Ноги" },
  { name: "Отведение ноги в тренажере поочередно стоя", muscleGroup: "Ноги" },
  { name: "Кардио (отметка)", muscleGroup: "Кардио", defaultSets: 0 }
];

const templates: TemplateSeed[] = [
  {
    name: "Понедельник",
    orderIndex: 1,
    exercises: [
      { name: "Жим лежа" },
      { name: "Жим от груди сидя в тренажере" },
      { name: "Тренажер Скота" },
      { name: "Подъемы на бицепс в кроссовере" },
      { name: "Вертикальный жим сидя в тренажере" },
      { name: "Подъемы ног в висе" },
      { name: "Подъемы ног лежа" },
      { name: "Скручивания на скамье" }
    ]
  },
  {
    name: "Вторник",
    orderIndex: 2,
    exercises: [
      { name: "Тяга верхнего блока" },
      { name: "Тяга вертикального блока" },
      { name: "Тяга в тренажере с упором в грудь" },
      { name: "Гиперэкстензия" },
      { name: "Разгибание на блоке из-за головы" },
      { name: "Разгибание рук на блоке с канатной рукоятью" },
      { name: "Тренажёр рычажный на трицепс сидя" },
      { name: "Вертикальный жим сидя в тренажере" },
      { name: "Подъемы ног в висе" },
      { name: "Подъемы ног лежа" },
      { name: "Скручивания на скамье" }
    ]
  },
  {
    name: "Четверг (ноги)",
    orderIndex: 3,
    exercises: [
      { name: "Жим платформы ногами", enabled: true },
      { name: "Приседания в тренажере", enabled: false },
      { name: "Сведение ног в тренажере" },
      { name: "Разведение ног в тренажере" },
      { name: "Разгибание ног сидя в тренажере" },
      { name: "Сгибание ног в тренажере лежа" },
      { name: "Тренажер для икр" },
      { name: "Отведение ноги в тренажере поочередно стоя" },
      { name: "Гиперэкстензия" }
    ]
  }
];

async function main(): Promise<void> {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {
        defaultSets: exercise.defaultSets ?? 4,
        muscleGroup: exercise.muscleGroup ?? null
      },
      create: {
        name: exercise.name,
        defaultSets: exercise.defaultSets ?? 4,
        muscleGroup: exercise.muscleGroup ?? null
      }
    });
  }

  for (const template of templates) {
    const tpl = await prisma.workoutTemplate.upsert({
      where: {
        name: template.name
      },
      update: {
        name: template.name,
        orderIndex: template.orderIndex
      },
      create: {
        name: template.name,
        orderIndex: template.orderIndex
      }
    });

    await prisma.templateExercise.deleteMany({
      where: { templateId: tpl.id }
    });

    for (let i = 0; i < template.exercises.length; i += 1) {
      const item = template.exercises[i];
      const exercise = await prisma.exercise.findUniqueOrThrow({ where: { name: item.name } });
      await prisma.templateExercise.create({
        data: {
          templateId: tpl.id,
          exerciseId: exercise.id,
          orderIndex: i,
          enabled: item.enabled ?? true
        }
      });
    }
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
