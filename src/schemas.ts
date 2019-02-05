import Joi from 'joi';

const commandList = Joi.array().items(
  Joi.string(),
  Joi.object().keys({
    cmd: Joi.string().required(),
    whenShell: Joi.string(),
  })
);

const hookMap = Joi.object().pattern(/^/, commandList);

const schemas = {
  config: Joi.object().keys({
    shell: Joi.string().required(),
    editor: Joi.string().required(),
    hooks: Joi.object()
      .keys({
        onSwitchFrom: hookMap.required(),
        onSwitchTo: hookMap.required(),
      })
      .required(),
  }),
  internalOptions: Joi.object().keys({
    activeProfile: Joi.string().required(),
  }),
};

export default schemas;
