/* eslint-disable no-undef, space-before-keywords, react/prop-types, react/no-multi-comp */

import React from 'react';
import { mount } from 'enzyme';
import createForm from '../src/createForm';

describe('binding dynamic fields without any errors', () => {
  it('normal input', (done) => {
    const Test = createForm({
      withRef: true,
    })(
      class extends React.Component {
        render() {
          const { form, mode } = this.props;
          const { getFieldDecorator } = form;
          return (
            <form>
              <span>text content</span>
              {mode ? getFieldDecorator('name')(<input id="text" />) : null}
              <span>text content</span>
              <span>text content</span>
              <span>text content</span>
              {mode ? null : getFieldDecorator('name')(<input id="number" type="number" />)}
              <span>text content</span>
            </form>
          );
        }
      }
    );
    const wrapper = mount(<Test mode />);
    const form = wrapper.ref('wrappedComponent').props.form;
    wrapper.find('#text').simulate('change', { target: { value: '123' } });
    wrapper.setProps({ mode: false });
    expect(wrapper.find('#number').getDOMNode().value).toBe('123');
    expect(form.getFieldValue('name')).toBe('123');
    wrapper.find('#number').simulate('change', { target: { value: '456' } });
    wrapper.setProps({ mode: true });
    expect(wrapper.find('#text').getDOMNode().value).toBe('456');
    expect(form.getFieldValue('name')).toBe('456');
    form.validateFields((errors, values) => {
      expect(errors).toBe(null);
      expect(values.name).toBe('456');
      done();
    });
  });

  it('nested fields', (done) => {
    const Test = createForm({
      withRef: true,
    })(
      class extends React.Component {
        render() {
          const { form, mode } = this.props;
          const { getFieldDecorator } = form;
          return (
            <form>
              {mode ? getFieldDecorator('name.xxx')(<input id="text" />) : null}
              <span>text content</span>
              {mode ? null : getFieldDecorator('name.xxx')(<input id="number" type="number" />)}
            </form>
          );
        }
      }
    );
    const wrapper = mount(<Test mode />);
    const form = wrapper.ref('wrappedComponent').props.form;
    wrapper.find('#text').simulate('change', { target: { value: '123' } });
    wrapper.setProps({ mode: false });
    expect(wrapper.find('#number').getDOMNode().value).toBe('123');
    expect(form.getFieldValue('name.xxx')).toBe('123');
    wrapper.find('#number').simulate('change', { target: { value: '456' } });
    wrapper.setProps({ mode: true });
    expect(wrapper.find('#text').getDOMNode().value).toBe('456');
    expect(form.getFieldValue('name.xxx')).toBe('456');

    form.validateFields((errors, values) => {
      expect(errors).toBe(null);
      expect(values.name.xxx).toBe('456');
      done();
    });
  });

  it('input with different keys', (done) => {
    const Test = createForm({
      withRef: true,
    })(
      class extends React.Component {
        render() {
          const { form, mode } = this.props;
          const { getFieldDecorator } = form;
          return (
            <form>
              {mode ? getFieldDecorator('name')(<input key="text" id="text" />) : null}
              {mode ? null : getFieldDecorator('name')(
                <input key="number" id="number" type="number" />
              )}
            </form>
          );
        }
      }
    );
    const wrapper = mount(<Test mode />);
    const form = wrapper.ref('wrappedComponent').props.form;
    wrapper.find('#text').simulate('change', { target: { value: '123' } });
    wrapper.setProps({ mode: false });
    expect(wrapper.find('#number').getDOMNode().value).toBe('123');
    expect(form.getFieldValue('name')).toBe('123');
    wrapper.find('#number').simulate('change', { target: { value: '456' } });
    wrapper.setProps({ mode: true });
    expect(wrapper.find('#text').getDOMNode().value).toBe('456');
    expect(form.getFieldValue('name')).toBe('456');
    form.validateFields((errors, values) => {
      expect(errors).toBe(null);
      expect(values.name).toBe('456');
      done();
    });
  });

  it('submit without removed fields', (done) => {
    const Test = createForm({
      withRef: true,
    })(
      class extends React.Component {
        render() {
          const { form, mode } = this.props;
          const { getFieldDecorator } = form;
          return (
            <form>
              {getFieldDecorator('name1')(<input />)}
              {getFieldDecorator('name2')(<input />)}
              {mode ? null : getFieldDecorator('name3')(<input />)}
              {mode ? null : getFieldDecorator('name4')(<input />)}
            </form>
          );
        }
      }
    );
    const wrapper = mount(<Test />);
    const form = wrapper.ref('wrappedComponent').props.form;
    form.validateFields((errors, values) => {
      expect(errors).toBe(null);
      expect('name1' in values).toBe(true);
      expect('name2' in values).toBe(true);
      expect('name3' in values).toBe(true);
      expect('name4' in values).toBe(true);
      wrapper.setProps({ mode: true });
      form.validateFields((errors2, values2) => {
        expect(errors2).toBe(null);
        expect('name1' in values2).toBe(true);
        expect('name2' in values2).toBe(true);
        expect('name3' in values2).toBe(false);
        expect('name4' in values2).toBe(false);
        done();
      });
    });
  });
});
