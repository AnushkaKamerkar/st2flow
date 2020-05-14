// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import TestRenderer from 'react-test-renderer';

export class ReactInstanceTester {
  static create(instance) {
    if (typeof instance === 'string') {
      return instance;
    }

    return new this(instance);
  }

  constructor(instance) {
    this._instance = instance;
  }

  get type() {
    return this._instance.type;
  }
  
  get props() {
    return this._instance.props || {};
  }

  get parent() {
    return ReactInstanceTester.create(this._instance.parent);
  }

  get children() {
    return (this._instance.children || [])
      .map(instance => ReactInstanceTester.create(instance))
    ;
  }

  get className() {
    return this.props.className || '';
  }

  get classList() {
    return this.className.split(' ').filter(v => v);
  }

  get text() {
    return this.children
      .map(instance => typeof instance === 'string' ? instance : instance.text)
      .filter(v => typeof v === 'string')
      .map(v => v.trim())
      .join(' ')
    ;
  }

  findTests(id) {
    return this.findAllByProps({'data-test': id});
  }
}

const methods = [ 'find', 'findByType', 'findByProps', 'findAll', 'findAllByType', 'findAllByProps' ];
for (const method of methods) {
  if (method.startsWith('findAll')) {
    ReactInstanceTester.prototype[method] = function(...args) {
      return this._instance[method](...args)
        .map(instance => ReactInstanceTester.create(instance))
      ;
    };
  }
  else {
    ReactInstanceTester.prototype[method] = function(...args) {
      return ReactInstanceTester.create(this._instance[method](...args));
    };
  }
}

export class ReactTester extends ReactInstanceTester {
  constructor(component) {
    const render = TestRenderer.create(component);

    super(render.root);

    this._render = render;
  }

  get node() {
    return this.children[0];
  }

  toJSON() {
    return this._render.toJSON();
  }
}
