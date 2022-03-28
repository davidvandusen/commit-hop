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
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

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

const createTheWorld = () => {
  const engine = Engine.create({ gravity: { x: 0, y: 0.1 } });
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
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);
  return engine.world;
};

const animateLife = (data, world) => {
  const life = makeTreeComposite(data);
  Composite.add(world, life);
  return life;
};

const main = () => {
  const ydoc = new Y.Doc();
  new WebsocketProvider('wss://ywss.figureandsound.com', 'dev-data', ydoc);
  let life;
  const world = createTheWorld();
  const addLife = () => {
    const newChild = new Y.Map();
    newChild.set('x', Math.random() * 600 + 50);
    newChild.set('y', Math.random() * 400 + 50);
    newChild.set('r', Math.random() * 50 + 10);
    newChild.set('children', new Y.Array());
    ydoc.getMap('root').get('children').push([newChild]);
    showLife();
  };
  const removeLife = () => {
    const children = ydoc.getMap('root').get('children');
    children.delete(0, children.length);
    showLife();
  };
  const showLife = () => {
    if (life) Composite.remove(world, life);
    life = animateLife(ydoc.getMap('root').toJSON(), world);
  };
  ydoc.on('update', () => {
    showLife();
  });
  document
    .getElementById('button-for-clicking')
    .addEventListener('click', () => {
      addLife();
    });
  document
    .getElementById('button-for-destroying')
    .addEventListener('click', () => {
      removeLife();
    });
};

main();
