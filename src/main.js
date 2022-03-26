import {
  Bodies,
  Composite,
  Constraint,
  Engine,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
} from 'matter-js';

const makeTreeComposite = tree => {
  const options = {
    collisionFilter: { group: -1 },
    render: { fillStyle: '#010242' },
  };
  const stiffness = 0.4;
  const walkTree = (node, bodies = [], constraints = []) => {
    const shape = Bodies.circle(node.x, node.y, node.r, options);
    bodies.push(shape);
    constraints.push(
      Constraint.create({
        bodyB: shape,
        pointA: { x: node.x, y: node.y },
        pointB: { x: 0, y: 0 },
        stiffness: stiffness,
        render: {
          visible: false,
        },
      })
    );
    const childShapes = [];
    for (let child of node.children) {
      const { shape: childShape } = walkTree(child, bodies, constraints);
      constraints.push(
        Constraint.create({
          bodyA: shape,
          bodyB: childShape,
          pointA: { x: 0, y: 0 },
          pointB: { x: 0, y: 0 },
          stiffness: stiffness,
          render: {
            visible: false,
          },
        })
      );
      childShapes.push(childShape);
    }
    for (let childShapeA of childShapes) {
      for (let childShapeB of childShapes) {
        constraints.push(
          Constraint.create({
            bodyA: childShapeA,
            bodyB: childShapeB,
            pointA: { x: 0, y: 0 },
            pointB: { x: 0, y: 0 },
            stiffness: stiffness,
            render: {
              visible: false,
            },
          })
        );
      }
    }
    return { bodies, constraints, shape };
  };
  const { bodies, constraints } = walkTree(tree);
  return Composite.create({ bodies, constraints });
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
  Composite.add(
    engine.world,
    makeTreeComposite({
      x: 400,
      y: 300,
      r: 50,
      children: [
        {
          x: 400,
          y: 100,
          r: 50,
          children: [
            {
              x: 400,
              y: 200,
              r: 75,
              children: [],
            },
            {
              x: 300,
              y: 200,
              r: 50,
              children: [
                { x: 300, y: 150, r: 25, children: [] },
                { x: 250, y: 150, r: 25, children: [] },
                { x: 250, y: 200, r: 25, children: [] },
                { x: 250, y: 250, r: 25, children: [] },
                { x: 300, y: 250, r: 25, children: [] },
              ],
            },
            { x: 500, y: 200, r: 50, children: [] },
          ],
        },
      ],
    })
  );
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);
};

main();
