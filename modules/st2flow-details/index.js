//@flow

import type { ModelInterface, TaskInterface, TransitionRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import { connect } from '@stackstorm/st2flow-model';

import AutoForm from '@stackstorm/module-auto-form';
import Editor from '@stackstorm/st2flow-editor';
import Button from '@stackstorm/module-forms/button.component';
import { Panel, Toolbar, ToolbarButton } from './layout';
import Property from './property';

import StringField from '@stackstorm/module-auto-form/fields/string';

import Meta from './meta-panel';
import Transition from './transition';

import style from './style.css';

type Navigation = {
  type?: string,
  section?: string,
  asCode?: bool,
}

@connect(({ model }) => ({ model }))
class TaskDetails extends Component<{
  model: ModelInterface,
  selected: string,
  actions: Array<Object>,
  onBack: Function,
  navigation: Navigation,
  handleNavigationChange: Function,
}, {
  name: string,
}> {
  static propTypes = {
    model: PropTypes.object,
    selected: PropTypes.string,
    actions: PropTypes.array,
    onBack: PropTypes.func.isRequired,
    handleNavigationChange: PropTypes.func,
  }

  constructor(props) {
    super(props);
    this.state = {
      name: props.selected,
    };
  }

  handleNameChange(name) {
    this.setState({ name });
  }

  handleTaskRename(ref, name) {
    const { model, selected, onBack } = this.props;
    model && model.updateTask({ name: ref }, { name });
    if (selected === ref) {
      onBack();
    }
  }

  handleTaskFieldChange(field, value) {
    const { model, selected } = this.props;
    model.updateTask({ name: selected }, { [field]: value });
  }

  handleTaskProperty(name, value) {
    const { model, selected } = this.props;

    if (value) {
      model.setTaskProperty({ name: selected }, name, value);
    }
    else {
      model.deleteTaskProperty({ name: selected }, name);
    }
  }

  handleTransitionProperty(transition: TransitionRefInterface, name, value) {
    const { model } = this.props;

    if (value) {
      model.setTransitionProperty(transition, name, value);
    }
    else {
      model.deleteTransitionProperty(transition, name);
    }
  }

  handleSectionSwitch(section) {
    this.props.handleNavigationChange({ section });
  }

  style = style
  joinFieldRef = React.createRef();

  render() {
    const { model, selected, onBack, actions } = this.props;
    const { section = 'task' } = this.props.navigation;
    const { name } = this.state;

    const task = selected && model.tasks.find(task => task.name === selected);

    if (!task) {
      return false;
    }

    const transitions = !!selected && model.transitions
      .filter(transition => transition.from.name === task.name)
      .reduce((acc, transition) => {
        const t = acc.find(t => t.condition === transition.condition);
        if (!t) {
          return acc.concat({ ...transition, to: [ transition.to ] });
        }
        t.to = t.to.concat([ transition.to ]);
        return acc;
      }, []);

    const action = actions.find(({ref}) => ref === task.action);

    return ([
      <Toolbar key="toolbar" secondary={true} >
        <ToolbarButton
          className="icon-chevron_left"
          onClick={() => onBack()}
        />
        <Task task={task} />
      </Toolbar>,
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('task')} selected={section === 'task'}>Task</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('input')} selected={section === 'input'}>Input</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('properties')} selected={section === 'properties'}>Properties</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('transitions')} selected={section === 'transitions'}>Transitions</ToolbarButton>
      </Toolbar>,
      section === 'task' && (
        <Panel key="task">
          <div className={this.style.combination}>
            <div className={this.style.combinationField} >
              <StringField name="name" value={name} onChange={name => this.handleNameChange(name)} />
            </div>
            {
              task.name !== name && (
                <div className={this.style.combinationButton} >
                  <Button onClick={() => this.handleTaskRename(task.name, name)} value="Rename task" />
                </div>
              )
            }
          </div>
          <StringField name="action" value={task.action} onChange={value => this.handleTaskFieldChange('action', value)} />
        </Panel>
      ),
      section === 'input' && (
        <Panel key="input">
          <AutoForm
            spec={{
              type: 'object',
              properties: action && action.parameters || {},
            }}
            data={task.input}
            onChange={(runValue) => this.handleTaskFieldChange('input', { ...task.input, ...runValue })}
          />
        </Panel>
      ),
      section === 'properties' && (
        <Panel key="properties">
          <Property name="Join" description="Allows to synchronize multiple parallel workflow branches and aggregate their data."  value={!!task.join} onChange={value => this.handleTaskProperty('join', value ? 'all' : false)}>
            {
              task.join && (
                <div className={cx(this.style.propertyChild, this.style.radioGroup)}>
                  <div className={cx(this.style.radio, task.join === 'all' && this.style.checked)} onClick={() => this.handleTaskProperty('join', 'all')}>
                    Join all tasks
                  </div>
                  <label htmlFor="joinField" className={cx(this.style.radio, task.join !== 'all' && this.style.checked)} onClick={(e) => this.handleTaskProperty('join', (this.joinFieldRef.current || {}).value)} >
                    Join <input type="text" id="joinField" ref={this.joinFieldRef} value={isNaN(task.join) ? 10 : task.join} onChange={e => this.handleTaskProperty('join', e.target.value)} /> tasks
                  </label>
                </div>
              )
            }
          </Property>
          <Property name="With Items" description="Run an action or workflow associated with a task multiple times." value={!!task.with} onChange={value => this.handleTaskProperty('with', value ? { items: 'x in [1, 2, 3]' } : false)}>
            {
              task.with && (
                <div className={this.style.propertyChild}>
                  <StringField name="items" value={task.with.items} onChange={value => this.handleTaskProperty([ 'with', 'items' ], value)} />
                  <StringField name="concurrency" value={task.with.concurrency} onChange={value => this.handleTaskProperty([ 'with', 'concurrency' ], value)} />
                </div>
              )
            }
          </Property>
        </Panel>
      ),
      section === 'transitions' && (
        <Panel key="transitions">
          {
            (transitions || []).map((transition, index) => <Transition key={index} transition={transition} onChange={(name, value) => this.handleTransitionProperty(transition, name, value)} />)
          }
          <div className={this.style.transitionInfo}>
            To add a transition, hover over a task box and drag the connector to the desired task box you want to transition to.
          </div>
        </Panel>
      ),
    ]);
  }
}

@connect(({ model }) => ({ model }))
class TaskList extends Component<{
  model: ModelInterface,
  onSelect: Function,
}> {
  static propTypes = {
    model: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
  }

  style = style

  render() {
    const { model, onSelect } = this.props;

    return (
      <Panel className={this.style.taskPanel}>
        {
          model.tasks.map(task => (
            <Task
              key={task.name}
              task={task}
              onClick={() => onSelect(task)}
            />
          ))
        }
      </Panel>
    );
  }
}

class Task extends Component<{
  task: TaskInterface,
  onClick?: Function,
}> {
  static propTypes = {
    task: PropTypes.object.isRequired,
    onClick: PropTypes.func,
  }

  style = style

  handleClick(e) {
    const { onClick } = this.props;

    if (!onClick) {
      return;
    }

    e.stopPropagation();

    onClick();
  }

  render() {
    const { task } = this.props;

    return (
      <div
        key={task.name}
        className={this.style.task}
        onClick={e => this.handleClick(e)}
      >
        <div className={this.style.taskName}>{ task.name }</div>
        <div className={this.style.taskAction}>{ task.action }</div>
      </div>
    );
  }
}

@connect(({ model, metaModel }) => ({ model, metaModel }))
export default class Details extends Component<{
  className?: string,
  model: ModelInterface,
  metaModel: ModelInterface,
  actions: Array<Object>,
  selected: string,
  onSelect: Function,
}, {
  navigation: Navigation,
}> {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object,
    metaModel: PropTypes.object,
    actions: PropTypes.array,
    selected: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
  }

  state = {
    navigation: {
      type: undefined,
      asCode: false,
    },
  }

  style = style

  handleNavigationChange(change: { type: string }) {
    const { navigation } = this.state;

    this.setState({ navigation: { ...navigation, ...change } });
  }

  handleCodeToggle() {
    const { navigation } = this.state;

    navigation.asCode = !navigation.asCode;

    this.setState({ navigation });
  }

  handleTaskSelect(task: TaskInterface) {
    this.props.onSelect(task.name);
  }

  handleBack() {
    this.props.onSelect();
  }

  render() {
    const sections = [{
      title: 'metadata',
      className: 'icon-gear',
    }, {
      title: 'execution',
      className: 'icon-lan',
    }];

    const { selected: taskSelected, actions } = this.props;
    const { type = 'metadata', asCode } = this.state.navigation;

    return (
      <div className={cx(this.props.className, this.style.component)}>
        <Toolbar>
          {
            sections.map(section => {
              return (
                <ToolbarButton
                  key={section.title}
                  className={section.className}
                  selected={type === section.title}
                  onClick={() => this.handleNavigationChange({ type: section.title, section: undefined })}
                />
              );
            })
          }
          <ToolbarButton className={cx(style.code, 'icon-code')} selected={asCode} onClick={() => this.handleCodeToggle()} />
        </Toolbar>
        {
          type === 'metadata' && (
            asCode
              && <Editor model={this.props.metaModel} />
              // $FlowFixMe Model is populated via decorator
              || <Meta navigation={this.state.navigation} handleNavigationChange={navigation => this.handleNavigationChange(navigation)} />
          )
        }
        {
          type === 'execution' && (
            asCode
              && <Editor model={this.props.model} />
              || taskSelected
                // $FlowFixMe ^^
                && <TaskDetails onBack={() => this.handleBack()} selected={taskSelected} actions={actions} navigation={this.state.navigation} handleNavigationChange={navigation => this.handleNavigationChange(navigation)} />
                // $FlowFixMe ^^
                || <TaskList onSelect={task => this.handleTaskSelect(task)} />
          )
        }
      </div>
    );
  }
}