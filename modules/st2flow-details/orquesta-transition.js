//@flow

import type { TaskRefInterface, TransitionRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import cx from 'classnames';

import { StringField, SelectField } from '@stackstorm/module-auto-form/fields';
import { Toggle } from '@stackstorm/module-forms/button.component';

import style from './style.css';

type TransitionProps = {
  transition: {
    to: Array<TaskRefInterface>,
    condition?: string,
    publish?: string,
  },
  taskNames: Array<string> | string,
  selected: boolean,
  onChange: Function,
};

@connect(
  null,
  (dispatch) => ({
    onChange: (transition: TransitionRefInterface, value: any) => {
      if (value !== null && value !== void 0) {
        dispatch({
          type: 'MODEL_ISSUE_COMMAND',
          command: 'setTransitionProperty',
          args: [
            transition,
            name,
            value,
          ],
        });
      }
      else {
        dispatch({
          type: 'MODEL_ISSUE_COMMAND',
          command: 'deleteTransitionProperty',
          args: [
            transition,
            name,
          ],
        });
      }
    },
  })
)
export default class Transition extends Component<TransitionProps, {
  publishOn: boolean,
}> {
  static propTypes = {
    transition: PropTypes.object.isRequired,
    taskNames: PropTypes.arrayOf(PropTypes.string),
    selected: PropTypes.bool,
    onChange: PropTypes.func,
  }

  constructor(props: TransitionProps) {
    super(props);

    this.state = {
      publishOn: !!props.transition.publish && Object.keys(props.transition.publish).length > 0,
    };
  }

  style = style
  cache = {} // used to cache togglable data

  onPublishToggle = (val: boolean) => {
    if(val) {
      if(this.cache.publish) {
        this.props.onChange('publish', this.cache.publish);
        delete this.cache.publish;
      }
      else {
        const { transition: { publish } } = this.props;

        if(!publish || !publish.length) {
          this.addPublishField();
        }
      }
    }
    else {
      this.cache.publish = this.props.transition.publish;
      this.props.onChange('publish', null);
    }

    this.setState({ publishOn: val });
  }

  handlePublishChange(index: number, key: string, value: string) {
    const { transition: { publish }, onChange } = this.props;
    const val = publish ? publish.slice(0) : [];

    // Make sure to mutate the copy
    val[index] = { [key]: value };
    onChange('publish', val);
  }

  handleDoChange(index: number, value: string | Array<string>) {
    const { transition: { to }, onChange } = this.props;
    const val = to.map(t => t.name);

    // Make sure to mutate the copy
    val[index] = value;
    onChange('do', val);
  }

  addPublishField = () => {
    const { transition: { publish }, onChange } = this.props;
    const newVal = { key: '<% result().val %>' };
    const val = this.state.publishOn ? publish.concat(newVal) : [ newVal ];

    onChange('publish', val);
  }

  addDoItem = (value) => {
    const { transition: { to }, onChange } = this.props;
    const val = (to || []).map(t => t.name).concat(value);
    onChange('do', val);
  }

  removePublishField = (index: number) => {
    const { transition: { publish }, onChange } = this.props;
    const val = publish.slice(0);

    // make sure to splice the copy!
    val.splice(index, 1);
    if(!val.length) {
      this.setState({ publishOn: false });
    }

    onChange('publish', val);
  }

  removeDoItem = (index: number) => {
    const { transition: { to }, onChange } = this.props;
    const val = to.map(t => t.name);

    // make sure to splice the copy!
    val.splice(index, 1);
    onChange('do', val);
  }

  render() {
    const { transition, taskNames, selected, onChange } = this.props;
    const { publishOn } = this.state;
    const to = transition.to.map(t => t.name);
    const taskOptions = taskNames.map(n => ({ text: n, value: n }));
    const publish = transition.publish;

    return (
      <div className={cx(this.style.transition, { [this.style.transitionSelected]: selected })}>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            When
          </div>
          <div className={this.style.transitionField}>
            <StringField value={transition.condition} onChange={v => onChange('when', v)} />
          </div>
          <div className={this.style.transitionButton} />
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Publish
          </div>
          <div className={this.style.transitionField}>
            <Toggle value={publishOn} onChange={this.onPublishToggle} />
          </div>
        </div>
        <div className={this.style.transitionPublish}>
          {publish && publish.map((obj, i) => {
            const key = Object.keys(obj)[0];
            const val = obj[key];

            return (
              <div className={this.style.transitionLine} key={`publish-${i}`} >
                <div className={this.style.transitionPublishKey}>
                  <StringField value={key} onChange={k => this.handlePublishChange(i, k, val)} />
                </div>
                <div className={this.style.transitionPublishValue}>
                  <StringField value={val} onChange={v => this.handlePublishChange(i, key, v)} />
                </div>
                <div className={this.style.transitionButton}>
                  <i className="icon-delete" onClick={() => this.removePublishField(i)} />
                  {i ===  publish.length - 1 &&
                    <i className="icon-plus" onClick={this.addPublishField} />
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Do
          </div>
          {to.length === 0 && (
            <div className={this.style.transitionField}>
              <SelectField spec={{ options: taskOptions }} onChange={v => this.addDoItem(v)} />
            </div>
          )}
          {to.map((toName, i) => {
            const options = taskOptions.filter(({ value }) => value === toName || !to.includes(value));
            const key = options.map(o => o.value).join('_');

            return ([
              <div key={key} className={this.style.transitionField}>
                <SelectField value={toName} spec={{ default: true, options }} onChange={v => this.handleDoChange(i, v)} />
              </div>,
              <div key={`${key}_delete`} className={this.style.transitionButton}>
                <i className="icon-delete" onClick={() => this.removeDoItem(i)} />
                {i === to.length - 1 && options.length &&
                  <i className="icon-plus" onClick={() => this.addDoItem(options[0].value)} />
                }
              </div>,
            ]);
          })}
          <div className={this.style.transitionButton}>
            <i className="icon-plus2" />
          </div>
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Color
          </div>
          <div className={this.style.transitionField}>
            <StringField />
          </div>
        </div>
      </div>
    );
  }
}