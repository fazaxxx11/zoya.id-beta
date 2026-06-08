class ValidationError extends Error {
    constructor(errors) {
        super('Validation failed');
        this.errors = errors;
    }
}

class Validator {
    constructor(type) {
        this.type = type;
        this.rules = [];
        this.optional = false;
    }

    optional() {
        this.optional = true;
        return this;
    }

    min(value) {
        this.rules.push((val) => {
            if (this.type === 'string' && val.length < value) {
                return `Minimum length is ${value}`;
            }
            if (this.type === 'number' && val < value) {
                return `Minimum value is ${value}`;
            }
            if (this.type === 'array' && val.length < value) {
                return `Minimum array length is ${value}`;
            }
            return null;
        });
        return this;
    }

    max(value) {
        this.rules.push((val) => {
            if (this.type === 'string' && val.length > value) {
                return `Maximum length is ${value}`;
            }
            if (this.type === 'number' && val > value) {
                return `Maximum value is ${value}`;
            }
            if (this.type === 'array' && val.length > value) {
                return `Maximum array length is ${value}`;
            }
            return null;
        });
        return this;
    }

    enum(values) {
        this.rules.push((val) => {
            if (!values.includes(val)) {
                return `Must be one of: ${values.join(', ')}`;
            }
            return null;
        });
        return this;
    }

    validate(value, path = '') {
        // Handle optional values
        if (this.optional && (value === undefined || value === null)) {
            return { valid: true, value: undefined };
        }

        // Type checking
        let typeError = null;
        switch (this.type) {
            case 'string':
                if (typeof value !== 'string') {
                    typeError = 'Must be a string';
                }
                break;
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    typeError = 'Must be a number';
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    typeError = 'Must be a boolean';
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    typeError = 'Must be an array';
                }
                break;
            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    typeError = 'Must be an object';
                }
                break;
        }

        if (typeError) {
            return { valid: false, error: path ? `${path}: ${typeError}` : typeError };
        }

        // Apply rules
        for (const rule of this.rules) {
            const error = rule(value);
            if (error) {
                return { valid: false, error: path ? `${path}: ${error}` : error };
            }
        }

        return { valid: true, value };
    }
}

export const z = {
    string: () => new Validator('string'),
    number: () => new Validator('number'),
    boolean: () => new Validator('boolean'),
    array: () => new Validator('array'),
    object: (schema) => {
        const validator = new Validator('object');
        validator.schema = schema;
        
        const originalValidate = validator.validate.bind(validator);
        validator.validate = function(value, path = '') {
            const baseResult = originalValidate(value, path);
            if (!baseResult.valid) {
                return baseResult;
            }

            if (value === undefined || value === null) {
                return { valid: true, value };
            }

            const result = {};
            const errors = [];

            for (const [key, fieldValidator] of Object.entries(schema)) {
                const fieldPath = path ? `${path}.${key}` : key;
                const fieldResult = fieldValidator.validate(value[key], fieldPath);
                
                if (!fieldResult.valid) {
                    errors.push(fieldResult.error);
                } else if (fieldResult.value !== undefined) {
                    result[key] = fieldResult.value;
                }
            }

            if (errors.length > 0) {
                return { valid: false, errors };
            }

            return { valid: true, value: result };
        };

        return validator;
    },
};

export function validate(data, schema) {
    const result = schema.validate(data);
    
    if (!result.valid) {
        return {
            success: false,
            errors: Array.isArray(result.errors) ? result.errors : [result.error]
        };
    }
    
    return {
        success: true,
        data: result.value
    };
}