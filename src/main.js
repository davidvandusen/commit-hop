import {
  Body,
  Bodies,
  Composite,
  Constraint,
  Common,
  Engine,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
} from 'matter-js';

// Adapted from https://github.com/liabru/matter-js/blob/master/examples/ragdoll.js
const makeRagDoll = (x, y) => {
  const defaultColor = '#010242';
  const headOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const chestOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const leftArmOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const leftLowerArmOptions = Common.extend({}, leftArmOptions);
  const rightArmOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const rightLowerArmOptions = Common.extend({}, rightArmOptions);
  const leftLegOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const leftLowerLegOptions = Common.extend({}, leftLegOptions);
  const rightLegOptions = {
    collisionFilter: { group: Body.nextGroup(true) },
    render: { fillStyle: defaultColor },
  };
  const rightLowerLegOptions = Common.extend({}, rightLegOptions);
  const head = Bodies.rectangle(x, y - 60, 34, 40, headOptions);
  const chest = Bodies.rectangle(x, y, 55, 80, chestOptions);
  const rightUpperArm = Bodies.rectangle(
    x + 39,
    y - 15,
    20,
    40,
    rightArmOptions
  );
  const rightLowerArm = Bodies.rectangle(
    x + 39,
    y + 25,
    20,
    60,
    rightLowerArmOptions
  );
  const leftUpperArm = Bodies.rectangle(x - 39, y - 15, 20, 40, leftArmOptions);
  const leftLowerArm = Bodies.rectangle(
    x - 39,
    y + 25,
    20,
    60,
    leftLowerArmOptions
  );
  const leftUpperLeg = Bodies.rectangle(x - 20, y + 57, 20, 40, leftLegOptions);
  const leftLowerLeg = Bodies.rectangle(
    x - 20,
    y + 97,
    20,
    60,
    leftLowerLegOptions
  );
  const rightUpperLeg = Bodies.rectangle(
    x + 20,
    y + 57,
    20,
    40,
    rightLegOptions
  );
  const rightLowerLeg = Bodies.rectangle(
    x + 20,
    y + 97,
    20,
    60,
    rightLowerLegOptions
  );
  const chestToRightUpperArm = Constraint.create({
    bodyA: chest,
    bodyB: rightUpperArm,
    pointA: { x: 24, y: -23 },
    pointB: { x: 0, y: -8 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const chestToLeftUpperArm = Constraint.create({
    bodyA: chest,
    bodyB: leftUpperArm,
    pointA: { x: -24, y: -23 },
    pointB: { x: 0, y: -8 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const chestToLeftUpperLeg = Constraint.create({
    bodyA: chest,
    bodyB: leftUpperLeg,
    pointA: { x: -10, y: 30 },
    pointB: { x: 0, y: -10 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const chestToRightUpperLeg = Constraint.create({
    bodyA: chest,
    bodyB: rightUpperLeg,
    pointA: { x: 10, y: 30 },
    pointB: { x: 0, y: -10 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const upperToLowerRightArm = Constraint.create({
    bodyA: rightUpperArm,
    bodyB: rightLowerArm,
    pointA: { x: 0, y: 15 },
    pointB: { x: 0, y: -25 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const upperToLowerLeftArm = Constraint.create({
    bodyA: leftUpperArm,
    bodyB: leftLowerArm,
    pointA: { x: 0, y: 15 },
    pointB: { x: 0, y: -25 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const upperToLowerLeftLeg = Constraint.create({
    bodyA: leftUpperLeg,
    bodyB: leftLowerLeg,
    pointA: { x: 0, y: 20 },
    pointB: { x: 0, y: -20 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const upperToLowerRightLeg = Constraint.create({
    bodyA: rightUpperLeg,
    bodyB: rightLowerLeg,
    pointA: { x: 0, y: 20 },
    pointB: { x: 0, y: -20 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const headConstraint = Constraint.create({
    bodyA: head,
    bodyB: chest,
    pointA: { x: 0, y: 25 },
    pointB: { x: 0, y: -35 },
    stiffness: 0.6,
    render: { visible: false },
  });
  const legToLeg = Constraint.create({
    bodyA: leftLowerLeg,
    bodyB: rightLowerLeg,
    stiffness: 0.01,
    render: { visible: false },
  });
  return Composite.create({
    bodies: [
      chest,
      head,
      leftLowerArm,
      leftUpperArm,
      rightLowerArm,
      rightUpperArm,
      leftLowerLeg,
      rightLowerLeg,
      leftUpperLeg,
      rightUpperLeg,
    ],
    constraints: [
      upperToLowerLeftArm,
      upperToLowerRightArm,
      chestToLeftUpperArm,
      chestToRightUpperArm,
      headConstraint,
      upperToLowerLeftLeg,
      upperToLowerRightLeg,
      chestToLeftUpperLeg,
      chestToRightUpperLeg,
      legToLeg,
    ],
  });
};

const main = () => {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const render = Render.create({
    element: document.getElementById('app'),
    engine,
    options: {
      background: 'transparent',
      height: 600,
      width: 800,
      wireframes: false,
    },
  });
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;
  Composite.add(engine.world, [
    Bodies.rectangle(400, 0, 800, 50, {
      isStatic: true,
      render: { visible: false },
    }),
    Bodies.rectangle(400, 600, 800, 50, {
      isStatic: true,
      render: { visible: false },
    }),
    Bodies.rectangle(800, 300, 50, 600, {
      isStatic: true,
      render: { visible: false },
    }),
    Bodies.rectangle(0, 300, 50, 600, {
      isStatic: true,
      render: { visible: false },
    }),
  ]);
  Composite.add(engine.world, makeRagDoll(400, 300));
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);
};

main();
