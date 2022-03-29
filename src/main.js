import {
  Bodies,
  Composite,
  Constraint,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Query,
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
    shape.yid = node.id;
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
          stiffness: 1,
          render:
            mode === modes.PLAY
              ? { visible: false }
              : {
                  strokeStyle: 'rgba(255,255,255,0.25)',
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
  const trash = Bodies.rectangle(20, 570, 50, 50, {
    isStatic: true,
    render: {
      sprite: {
        texture: '/trash.png',
        xScale: 0.5,
        yScale: 0.5,
      },
    },
  });
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
    trash,
  ]);
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);
  return { mouseConstraint, trash, world: engine.world };
};

const animateLife = (data, world) => {
  const life = makeTreeComposite(data);
  Composite.add(world, life);
  return life;
};

const main = () => {
  const ydoc = new Y.Doc();
  new WebsocketProvider('wss://ywss.figureandsound.com', 'data', ydoc);
  let life;
  const app = document.getElementById('app');
  const { mouseConstraint, trash, world } = createTheWorld(app);
  const addLife = (x, y, r, image) => {
    const newChild = new Y.Map();
    newChild.set('id', `${ydoc.clientID}-${Date.now()}`);
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
    root.set('id', 'root');
    root.set('x', 400);
    root.set('y', 300);
    root.set('r', 50);
    root.set('texture', '/body.png');
    const children = root.get('children');
    if (children) {
      children.delete(0, children.length);
    } else {
      root.set('children', new Y.Array());
    }
    showLife();
  };
  const showLife = () => {
    if (life) Composite.remove(world, life);
    life = animateLife(ydoc.getMap('root').toJSON(), world);
  };
  ydoc.on('update', () => {
    setTimeout(showLife, 0);
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
        JSON.stringify({
          image: new URL(event.target.src).pathname,
          size: event.target.width / 2,
        })
      );
    });
  });
  const canvas = app.querySelector('canvas');
  canvas.addEventListener('dragover', event => {
    event.preventDefault();
  });
  canvas.addEventListener('drop', event => {
    if (mode !== modes.EDIT) return;
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
  // Clicking on two objects will nest them. Trying to nest an object to the
  // trash can will delete it and its children.
  let nestBodyA;
  let nestBodyB;
  const destroyObject = yid => {
    const stack = [ydoc.getMap('root')];
    while (stack.length) {
      const node = stack.pop();
      if (node.get('id') === yid) {
        const yArray = node.parent;
        if (yArray) {
          yArray.delete(yArray.toArray().indexOf(node), 1);
        }
        return;
      }
      stack.push(...node.get('children'));
    }
  };
  const nestObjects = (yidA, yidB) => {
    let objA;
    let objB;
    const stack = [ydoc.getMap('root')];
    while (stack.length) {
      const node = stack.pop();
      if (node.get('id') === yidA) {
        objA = node;
      }
      if (node.get('id') === yidB) {
        objB = node;
      }
      if (objA && objB) {
        // TODO if B is a descendant of A then cancel
        const cloneA = objA.clone();
        const parentA = objA.parent;
        if (parentA) {
          parentA.delete(parentA.toArray().indexOf(objA), 1);
        }
        objB.get('children').insert(0, [cloneA]);
        return;
      }
      stack.push(...node.get('children'));
    }
  };
  Events.on(mouseConstraint, 'mousedown', event => {
    if (mode !== modes.EDIT) return;
    const [hoveredBody] = Query.point(
      [...Composite.allBodies(life), trash],
      event.mouse.position
    );
    if (hoveredBody) {
      if (!nestBodyA) {
        nestBodyA = hoveredBody;
      } else if (hoveredBody !== nestBodyA) {
        nestBodyB = hoveredBody;
      }
      if (nestBodyA && nestBodyB) {
        let destroyBody;
        if (nestBodyA === trash) {
          destroyBody = nestBodyB;
        }
        if (nestBodyB === trash) {
          destroyBody = nestBodyA;
        }
        if (destroyBody) {
          if (destroyBody.yid === 'root') {
            alert("Can't delete that one. Sorry!");
          } else if (destroyBody.yid) {
            destroyObject(destroyBody.yid);
          }
        }
        if (nestBodyA.yid === 'root') {
          alert("Can't move that one. Sorry!");
        } else if (nestBodyA.yid && nestBodyB.yid) {
          nestObjects(nestBodyA.yid, nestBodyB.yid);
        }
        nestBodyA = null;
        nestBodyB = null;
      }
    }
  });
};

main();
