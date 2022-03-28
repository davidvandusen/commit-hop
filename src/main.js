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

const modes = {
  EDIT: 'EDIT',
  PLAY: 'PLAY',
};

let mode = modes.EDIT;

const makeTreeComposite = tree => {
  const stiffness = 0.4;
  const walkTree = (node, bodies = [], constraints = []) => {
    const shape = Bodies.circle(node.x, node.y, node.r, {
      collisionFilter: { group: -1 },
      render: { sprite: { texture: node.texture } },
    });
    bodies.push(shape);
    if (mode === modes.EDIT) {
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
    }
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

const createTheWorld = element => {
  const engine = Engine.create({ gravity: { x: 0, y: 0.1 } });
  const render = Render.create({
    element,
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
  const app = document.getElementById('app');
  const world = createTheWorld(app);
  const addLife = (x, y, r, image) => {
    console.log(x, y, r, image);
    const newChild = new Y.Map();
    newChild.set('x', x);
    newChild.set('y', y);
    newChild.set('r', r);
    newChild.set('texture', image);
    newChild.set('children', new Y.Array());
    ydoc.getMap('root').get('children').push([newChild]);
    showLife();
  };
  const removeLife = () => {
    const root = ydoc.getMap('root');
    root.set('x', 400);
    root.set('y', 300);
    root.set('r', 50);
    root.set('texture', 'body.png');
    const children = root.get('children');
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
  document
    .getElementById('button-for-toggling')
    .addEventListener('click', () => {
      mode = mode === modes.PLAY ? modes.EDIT : modes.PLAY;
      showLife();
    });
  ['eyeball-for-dragging', 'body-for-dragging'].forEach(id => {
    document.getElementById(id).addEventListener('dragstart', event => {
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({ image: event.target.src, size: event.target.width / 2 })
      );
    });
  });
  const canvas = app.querySelector('canvas');
  canvas.addEventListener('dragover', event => {
    event.preventDefault();
  });
  canvas.addEventListener('drop', event => {
    const raw = event.dataTransfer.getData('application/json');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error(e);
      return;
    }
    addLife(event.offsetX, event.offsetY, parsed.size, parsed.image);
  });
};

main();
