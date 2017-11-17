import set from 'lodash/set';
import createFormField, { isFormField } from './createFormField';
import {
  flattenFields,
  getErrorStrs,
} from './utils';

class FieldsStore {
  constructor(fields) {
    this.fields = this.flattenFields(fields);
    this.fieldsMeta = {};
  }

  updateFields(fields) {
    this.fields = this.flattenFields(fields);
  }

  flattenFields(fields) {
    return flattenFields(fields, (_, node) => isFormField(node));
  }

  flattenRegisteredFields(fields) {
    const validFieldsName = this.getValidFieldsName();
    return flattenFields(fields, path => validFieldsName.includes(path));
  }

  setFieldsInitialValue = (initialValues) => {
    const flattenedInitialValues = this.flattenRegisteredFields(initialValues);
    const fieldsMeta = this.fieldsMeta;
    Object.keys(flattenedInitialValues).forEach(name => {
      if (fieldsMeta[name]) {
        this.setFieldMeta(name, {
          ...this.getFieldMeta(name),
          initialValue: flattenedInitialValues[name],
        });
      }
    });
  }

  setFields(fields) {
    const fieldsMeta = this.fieldsMeta;
    const nowFields = {
      ...this.fields,
      ...fields,
    };
    const nowValues = {};
    Object.keys(fieldsMeta)
      .forEach((f) => nowValues[f] = this.getValueFromFields(f, nowFields));
    Object.keys(nowValues).forEach((f) => {
      const value = nowValues[f];
      const fieldMeta = this.getFieldMeta(f);
      if (fieldMeta && fieldMeta.normalize) {
        const nowValue =
                fieldMeta.normalize(value, this.getValueFromFields(f, this.fields), nowValues);
        if (nowValue !== value) {
          nowFields[f] = {
            ...nowFields[f],
            value: nowValue,
          };
        }
      }
    });
    this.fields = nowFields;
  }

  resetFields(ns) {
    const { fields } = this;
    const names = ns ?
      this.getValidFieldsFullName(ns) :
      this.getValidFieldsName();
    return names.reduce((acc, name) => {
      const field = fields[name];
      if (field && 'value' in field) {
        acc[name] = {};
      }
      return acc;
    }, {});
  }

  setFieldMeta(name, meta) {
    this.fieldsMeta[name] = this.fieldsMeta[name] || [];
    this.fieldsMeta[name].push(meta);
    this.fieldsMeta[name] = this.fieldsMeta[name].slice(-2);
  }

  getFieldMeta(name) {
    if (!this.fieldsMeta[name]) {
      this.fieldsMeta[name] = [{}];
    }
    return this.fieldsMeta[name][this.fieldsMeta[name].length - 1];
  }

  getValueFromFields(name, fields) {
    const field = fields[name];
    if (field && 'value' in field) {
      return field.value;
    }
    const fieldMeta = this.getFieldMeta(name);
    return fieldMeta && fieldMeta.initialValue;
  }

  getAllValues = () => {
    const { fieldsMeta, fields } = this;
    return Object.keys(fieldsMeta)
      .reduce((acc, name) => set(acc, name, this.getValueFromFields(name, fields)), {});
  }

  getValidFieldsName() {
    const { fieldsMeta } = this;
    return fieldsMeta ?
      Object.keys(fieldsMeta).filter(name => !this.getFieldMeta(name).hidden) :
      [];
  }

  getValidFieldsFullName(maybePartialName) {
    const maybePartialNames = Array.isArray(maybePartialName) ?
      maybePartialName : [maybePartialName];
    return this.getValidFieldsName()
      .filter(fullName => maybePartialNames.some(partialName => (
        fullName === partialName || (
          fullName.startsWith(partialName) &&
            ['.', '['].includes(fullName[partialName.length])
        )
      )));
  }

  getFieldValuePropValue(fieldMeta) {
    const { name, getValueProps, valuePropName } = fieldMeta;
    const field = this.getField(name);
    const fieldValue = 'value' in field ?
      field.value : fieldMeta.initialValue;
    if (getValueProps) {
      return getValueProps(fieldValue);
    }
    return { [valuePropName]: fieldValue };
  }

  getField(name) {
    return {
      ...this.fields[name],
      name,
    };
  }

  getNotCollectedFields() {
    return this.getValidFieldsName()
      .filter(name => !this.fields[name])
      .map(name => ({
        name,
        dirty: false,
        value: this.getFieldMeta(name).initialValue,
      }))
      .reduce((acc, field) => set(acc, field.name, createFormField(field)), {});
  }

  getNestedAllFields() {
    return Object.keys(this.fields)
      .reduce(
        (acc, name) => set(acc, name, createFormField(this.fields[name])),
        this.getNotCollectedFields()
      );
  }

  getFieldMember(name, member) {
    return this.getField(name)[member];
  }

  getNestedFields(names, getter) {
    const fields = names || this.getValidFieldsName();
    return fields.reduce((acc, f) => set(acc, f, getter(f)), {});
  }

  getNestedField(name, getter) {
    const fullNames = this.getValidFieldsFullName(name);
    if (
      fullNames.length === 0 || // Not registered
        (fullNames.length === 1 && fullNames[0] === name) // Name already is full name.
    ) {
      return getter(name);
    }
    const isArrayValue = fullNames[0][name.length] === '[';
    const suffixNameStartIndex = isArrayValue ? name.length : name.length + 1;
    return fullNames
      .reduce(
        (acc, fullName) => set(
          acc,
          fullName.slice(suffixNameStartIndex),
          getter(fullName)
        ),
        isArrayValue ? [] : {}
      );
  }

  getFieldsValue = (names) => {
    return this.getNestedFields(names, this.getFieldValue);
  }

  getFieldValue = (name) => {
    const { fields } = this;
    return this.getNestedField(name, (fullName) => this.getValueFromFields(fullName, fields));
  }

  getFieldsError = (names) => {
    return this.getNestedFields(names, this.getFieldError);
  }

  getFieldError = (name) => {
    return this.getNestedField(
      name,
      (fullName) => getErrorStrs(this.getFieldMember(fullName, 'errors'))
    );
  }

  isFieldValidating = (name) => {
    return this.getFieldMember(name, 'validating');
  }

  isFieldsValidating = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => this.isFieldValidating(n));
  }

  isFieldTouched = (name) => {
    return this.getFieldMember(name, 'touched');
  }

  isFieldsTouched = (ns) => {
    const names = ns || this.getValidFieldsName();
    return names.some((n) => this.isFieldTouched(n));
  }

  clearField(name) {
    this.fieldsMeta[name] = this.fieldsMeta[name] || [];
    this.fieldsMeta[name].unshift();
    if (this.fieldsMeta[name].length === 0) {
      delete this.fields[name];
      delete this.fieldsMeta[name];
    }
  }
}

export default function createFieldsStore(fields) {
  return new FieldsStore(fields);
}
