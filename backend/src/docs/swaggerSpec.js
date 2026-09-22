/**
 * OpenAPI 3.0.0 Specification for IAS Officers Canteen Services
 */
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'IAS Officers Canteen Services API',
    version: '1.0.0',
    description: `### Official API Documentation for IAS Officers Canteen Services
Government of India • Cabinet Secretariat

This API powers the entire digital dining ecosystem for IAS Officers:
- **Authentication & Lifetime QR**: Register officers, issue cryptographically signed lifetime login QR codes delivered directly via WhatsApp, and authenticate via QR scan.
- **Food Menu Catalog**: Manage meal slots (Breakfast, Lunch, Dinner, Snacks), dietary types (Veg/Non-Veg), portion pricing, and instant stock availability.
- **Cart & Bill Generation**: Order validation, instant Canteen Bill receipts with dynamic Restaurant UPI QR codes dispatched to registered WhatsApp mobiles.
- **Orders & Kitchen Display (KOT)**: 5-stage order lifecycle (\`NEW\` ➔ \`ACCEPTED\` ➔ \`PREPARING\` ➔ \`READY\` ➔ \`COMPLETED\`), pre-ordering, and payment collection.
- **WhatsApp Gateway**: Multi-provider messaging (WhatsApp Web Baileys, Meta Cloud API, Twilio) for automated QR and bill dispatches.`,
    contact: {
      name: 'Canteen Services Administration',
      email: 'canteen.admin@gov.in'
    }
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development & Kitchen Server'
    }
  ],
  tags: [
    {
      name: 'Authentication & Officers',
      description: 'Officer registration, Lifetime QR login, profile retrieval, QR regeneration & revocation'
    },
    {
      name: 'Food Menu',
      description: 'Food catalog, category filtering, stock toggles, dish price updates & image upload'
    },
    {
      name: 'Shopping Cart & Bill',
      description: 'Cart management, checkout, and Canteen Bill receipt generation with Restaurant QR dispatch'
    },
    {
      name: 'Orders & Kitchen Display (KOT)',
      description: 'Order lifecycle transitions, live kitchen tickets, payment dues, and WhatsApp payment QR'
    },
    {
      name: 'WhatsApp & QR Gateway',
      description: 'WhatsApp Web pairing, multi-provider gateway configuration, and dispatched QR outbox'
    },
    {
      name: 'System & Search Proxy',
      description: 'System health status, database diagnostics, and SerpApi Google Images search proxy'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT authentication token obtained from officer login or QR login.'
      }
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' }
        }
      },
      Officer: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '68caa123456789abcdef1234' },
          name: { type: 'string', example: 'Dr. Rajesh Kumar, IAS' },
          phone: { type: 'string', example: '+91 98888 88888' },
          email: { type: 'string', example: 'rajesh.kumar@gov.in' },
          designation: { type: 'string', example: 'Principal Secretary' },
          department: { type: 'string', example: 'Cabinet Secretariat' },
          avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' },
          lifetimeQrPayload: { type: 'string', example: 'APPQR:v1:68caa...:sig' },
          lifetimeQrImage: { type: 'string', example: '/uploads/qr/qr_68caa.png' },
          qrRevoked: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      FoodItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'food-d1' },
          name: { type: 'string', example: 'Masala Dosa' },
          category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks'], example: 'breakfast' },
          subCategory: { type: 'string', example: 'South Indian' },
          price: { type: 'number', example: 45 },
          availableQuantity: { type: 'integer', example: 50 },
          portion: { type: 'string', example: '1 plate with Sambar & 2 Chutneys' },
          isVeg: { type: 'boolean', example: true },
          isAvailable: { type: 'boolean', example: true },
          image: { type: 'string', example: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc' },
          preparationTime: { type: 'string', example: '10 mins' }
        }
      },
      CartItem: {
        type: 'object',
        properties: {
          foodId: { type: 'string', example: 'food-d1' },
          name: { type: 'string', example: 'Masala Dosa' },
          quantity: { type: 'integer', example: 2 },
          price: { type: 'number', example: 45 },
          total: { type: 'number', example: 90 },
          image: { type: 'string', example: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '68cbb987654321fedcba5678' },
          orderNumber: { type: 'string', example: 'ORD-2026-85308' },
          tokenNumber: { type: 'integer', example: 42 },
          userId: { type: 'string', example: '68caa123456789abcdef1234' },
          userName: { type: 'string', example: 'Dr. Rajesh Kumar, IAS' },
          userPhone: { type: 'string', example: '+91 98888 88888' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          },
          subtotal: { type: 'number', example: 90 },
          totalAmount: { type: 'number', example: 90 },
          status: {
            type: 'string',
            enum: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            example: 'ACCEPTED'
          },
          paymentStatus: {
            type: 'string',
            enum: ['UNPAID', 'PAYMENT_PENDING', 'PAID'],
            example: 'UNPAID'
          },
          paymentMethod: { type: 'string', example: 'restaurant_qr' },
          orderType: { type: 'string', enum: ['INSTANT', 'PRE_ORDER'], example: 'INSTANT' },
          pickupTime: { type: 'string', nullable: true, example: '13:30' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      BillReceipt: {
        type: 'object',
        properties: {
          billNumber: { type: 'string', example: 'BILL-2026-85308' },
          orderNumber: { type: 'string', example: 'ORD-2026-85308' },
          grandTotal: { type: 'number', example: 90 },
          paymentStatus: { type: 'string', example: 'UNPAID' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Dr. Rajesh Kumar, IAS' },
              phone: { type: 'string', example: '+91 98888 88888' }
            }
          },
          generatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    // =========================================================================
    // 1. AUTHENTICATION & OFFICERS
    // =========================================================================
    '/api/auth/register': {
      post: {
        tags: ['Authentication & Officers'],
        summary: 'Register new IAS Officer with automatic Lifetime QR generation',
        description: 'Creates a new officer record. Generates a cryptographically signed Lifetime Login QR code and dispatches the QR image directly to the officer registered WhatsApp mobile number.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string', example: 'Dr. Rajesh Kumar' },
                  phone: { type: 'string', example: '+91 98888 88888' },
                  email: { type: 'string', example: 'rajesh.ias@gov.in' },
                  password: { type: 'string', example: 'ias@2026' },
                  designation: { type: 'string', example: 'Principal Secretary' },
                  department: { type: 'string', example: 'Cabinet Secretariat' },
                  avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Officer registered and lifetime QR dispatched via WhatsApp',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/Officer' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error or invalid mobile number' },
          409: { description: 'Phone number already registered' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication & Officers'],
        summary: 'Standard password / PIN login for Officer',
        description: 'Authenticate an IAS officer using registered mobile/email and credentials.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'password'],
                properties: {
                  phone: { type: 'string', example: '+91 98888 88888' },
                  email: { type: 'string', example: 'rajesh.ias@gov.in' },
                  password: { type: 'string', example: 'ias@2026' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Officer authenticated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/Officer' }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/qr-login': {
      post: {
        tags: ['Authentication & Officers'],
        summary: 'Authenticate officer via Lifetime QR code scan',
        description: 'Validates the cryptographically signed Lifetime QR payload scanned by the mobile camera. Returns a fresh JWT and authenticates the officer immediately without expiration or burn.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrPayload'],
                properties: {
                  qrPayload: {
                    type: 'string',
                    example: 'APPQR:v1:68caa123456789abcdef1234:7f9a1b2c3d4e5f'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'QR login authenticated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/Officer' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid or revoked QR code' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication & Officers'],
        summary: 'Get current authenticated officer profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current officer profile details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/Officer' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized / Missing token' }
        }
      }
    },
    '/api/auth/my-qr': {
      get: {
        tags: ['Authentication & Officers'],
        summary: 'Retrieve own Lifetime Login QR code',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Officer lifetime QR credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    lifetimeQrPayload: { type: 'string' },
                    lifetimeQrDataUrl: { type: 'string' },
                    lifetimeQrImage: { type: 'string' },
                    qrRevoked: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/users': {
      get: {
        tags: ['Authentication & Officers'],
        summary: 'List all registered IAS officers (Admin)',
        description: 'Returns the complete list of registered officers for the Admin Directory and QR Management page.',
        responses: {
          200: {
            description: 'List of registered officers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 12 },
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Officer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/users/{id}': {
      put: {
        tags: ['Authentication & Officers'],
        summary: 'Update officer registered mobile number or profile',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone: { type: 'string', example: '+91 98888 88888' },
                  name: { type: 'string', example: 'Dr. Rajesh Kumar, IAS' },
                  email: { type: 'string', example: 'rajesh.kumar@gov.in' },
                  designation: { type: 'string' },
                  department: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Officer profile updated successfully' },
          404: { description: 'Officer not found' }
        }
      },
      delete: {
        tags: ['Authentication & Officers'],
        summary: 'Remove officer account (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Officer removed successfully' },
          404: { description: 'Officer not found' }
        }
      }
    },
    '/api/auth/users/{id}/regenerate-qr': {
      post: {
        tags: ['Authentication & Officers'],
        summary: 'Regenerate Lifetime Login QR for Officer and dispatch via WhatsApp',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'New Lifetime QR generated and sent to officer mobile via WhatsApp',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    qrInfo: {
                      type: 'object',
                      properties: {
                        qrId: { type: 'string' },
                        payload: { type: 'string' },
                        qrImage: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/users/{id}/revoke-qr': {
      post: {
        tags: ['Authentication & Officers'],
        summary: 'Revoke Officer Lifetime Login QR (Security / Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Officer lifetime QR code revoked successfully' }
        }
      }
    },

    // =========================================================================
    // 2. FOOD MENU
    // =========================================================================
    '/api/foods': {
      get: {
        tags: ['Food Menu'],
        summary: 'Get customer food menu catalog',
        description: 'Retrieves available dishes with optional filtering by meal slot, dietary type, or search term.',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks'] } },
          { name: 'subCategory', in: 'query', schema: { type: 'string' } },
          { name: 'isVeg', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'List of available food items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 16 },
                    food: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FoodItem' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Food Menu'],
        summary: 'Add new food item to canteen menu (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'category', 'price'],
                properties: {
                  name: { type: 'string', example: 'Paneer Butter Masala' },
                  category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks'], example: 'lunch' },
                  subCategory: { type: 'string', example: 'North Indian' },
                  price: { type: 'number', example: 120 },
                  availableQuantity: { type: 'integer', example: 50 },
                  portion: { type: 'string', example: '1 bowl with 2 rotis' },
                  isVeg: { type: 'boolean', example: true },
                  image: { type: 'string', example: 'https://images.unsplash.com/...' },
                  preparationTime: { type: 'string', example: '15 mins' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Food item added successfully' }
        }
      }
    },
    '/api/foods/admin': {
      get: {
        tags: ['Food Menu'],
        summary: 'Get all food items including out-of-stock (Admin)',
        responses: {
          200: {
            description: 'Full food catalog for admin management',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer' },
                    food: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FoodItem' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/foods/{id}': {
      get: {
        tags: ['Food Menu'],
        summary: 'Get single food item details by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Food item details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    food: { $ref: '#/components/schemas/FoodItem' }
                  }
                }
              }
            }
          },
          404: { description: 'Food item not found' }
        }
      },
      put: {
        tags: ['Food Menu'],
        summary: 'Update food item, price, or toggle stock availability (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  isAvailable: { type: 'boolean' },
                  availableQuantity: { type: 'integer' },
                  category: { type: 'string' },
                  image: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Food item updated successfully' }
        }
      },
      delete: {
        tags: ['Food Menu'],
        summary: 'Delete food item from menu (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Food item deleted successfully' }
        }
      }
    },
    '/api/foods/upload': {
      post: {
        tags: ['Food Menu'],
        summary: 'Upload dish image in Base64 (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['imageBase64'],
                properties: {
                  imageBase64: { type: 'string', example: 'data:image/jpeg;base64,...' },
                  imageName: { type: 'string', example: 'paneer-dish.jpg' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Image uploaded and static URL returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    imageUrl: { type: 'string', example: 'http://localhost:5001/uploads/dish-1789984.jpg' },
                    fileName: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // =========================================================================
    // 3. SHOPPING CART & BILL
    // =========================================================================
    '/api/cart': {
      get: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Get current officer shopping cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User cart items and totals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    cart: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CartItem' }
                        },
                        totalAmount: { type: 'number', example: 135 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/cart/add': {
      post: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Add dish to cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['foodId', 'quantity'],
                properties: {
                  foodId: { type: 'string', example: 'food-d1' },
                  quantity: { type: 'integer', minimum: 1, example: 2 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Food added to cart successfully' }
        }
      }
    },
    '/api/cart/update': {
      put: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Update item quantity in cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['foodId', 'quantity'],
                properties: {
                  foodId: { type: 'string', example: 'food-d1' },
                  quantity: { type: 'integer', minimum: 1, example: 3 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Cart updated successfully' }
        }
      }
    },
    '/api/cart/remove/{foodId}': {
      delete: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Remove item from cart by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'foodId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Item removed from cart' }
        }
      }
    },
    '/api/cart/checkout': {
      post: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Checkout cart and send order to kitchen (KOT)',
        description: 'Validates cart items on backend, creates order, emits real-time KOT to kitchen, and clears the cart.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderType: { type: 'string', enum: ['INSTANT', 'PRE_ORDER'], example: 'INSTANT' },
                  pickupTime: { type: 'string', nullable: true, example: '13:30' },
                  orderNote: { type: 'string', example: 'Medium spicy, please' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Order placed and KOT dispatched to kitchen',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    order: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          400: { description: 'Cart is empty or food unavailable' }
        }
      }
    },
    '/api/cart/generate-bill': {
      post: {
        tags: ['Shopping Cart & Bill'],
        summary: 'Generate Canteen Bill and dispatch Restaurant QR to registered mobile via WhatsApp',
        description: 'Creates the order, formats an official 32-column Canteen Bill receipt with Restaurant UPI QR code, dispatches it to the officer registered mobile via WhatsApp, clears cart, and enables auto-logout.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderType: { type: 'string', enum: ['INSTANT', 'PRE_ORDER'] },
                  pickupTime: { type: 'string', nullable: true },
                  orderNote: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Bill receipt & Restaurant QR delivered to officer WhatsApp',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    registeredMobile: { type: 'string', example: '+91 98888 88888' },
                    bill: { $ref: '#/components/schemas/BillReceipt' },
                    order: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          502: { description: 'WhatsApp dispatch failed; order and cart kept intact' }
        }
      }
    },

    // =========================================================================
    // 4. ORDERS & KITCHEN DISPLAY (KOT)
    // =========================================================================
    '/api/orders/my-orders': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Get authenticated officer order history',
        description: 'Returns all past and active orders placed by the authenticated officer with strict user isolation.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of officer orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer' },
                    orders: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/unpaid': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Get unpaid orders and outstanding dues',
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'phone', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Unpaid orders summary and grand total due',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    totalDues: { type: 'number', example: 180 },
                    unpaidCount: { type: 'integer', example: 2 },
                    unpaidOrders: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/restaurant-qr': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Generate dynamic Restaurant UPI Payment QR code',
        parameters: [
          { name: 'amount', in: 'query', required: true, schema: { type: 'number', example: 120 } },
          { name: 'orderIds', in: 'query', schema: { type: 'string', example: 'ord_1,ord_2' } }
        ],
        responses: {
          200: {
            description: 'Dynamic UPI QR Data URL and payload',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    upiId: { type: 'string', example: 'canteen.treasury@sbi' },
                    upiPayload: { type: 'string' },
                    qrDataUrl: { type: 'string' },
                    amount: { type: 'number', example: 120 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}/send-payment-qr': {
      post: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Send Restaurant Payment QR + Bill receipt to registered WhatsApp mobile',
        description: 'Dispatches the restaurant UPI payment QR code and bill receipt directly to the officer verified mobile number on WhatsApp.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Payment QR dispatched to officer WhatsApp',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    registeredMobile: { type: 'string', example: '+91 98888 88888' },
                    qrDataUrl: { type: 'string' },
                    amount: { type: 'number', example: 90 },
                    deliveryStatus: { type: 'string', example: 'SENT' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}/pay': {
      post: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Record payment for completed order',
        description: 'Marks an order as PAID upon customer payment confirmation.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Order payment status updated to PAID' }
        }
      }
    },
    '/api/orders/admin/all': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Get all kitchen orders across all states (Admin)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] } },
          { name: 'paymentStatus', in: 'query', schema: { type: 'string', enum: ['UNPAID', 'PAID'] } }
        ],
        responses: {
          200: {
            description: 'List of all kitchen orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer' },
                    orders: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/admin/stats': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Get live executive canteen metrics (Admin)',
        responses: {
          200: {
            description: 'Canteen stats summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    stats: {
                      type: 'object',
                      properties: {
                        totalRevenue: { type: 'number', example: 6465 },
                        todayRevenue: { type: 'number', example: 4950 },
                        totalOrdersCount: { type: 'integer', example: 64 },
                        activeOrdersCount: { type: 'integer', example: 3 },
                        totalOfficersCount: { type: 'integer', example: 22 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}/status': {
      put: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Update kitchen order status (5-stage KOT lifecycle)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
                    example: 'PREPARING'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Order status updated successfully' }
        }
      }
    },
    '/api/orders/{id}/payment-status': {
      put: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Update order payment status (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentStatus'],
                properties: {
                  paymentStatus: {
                    type: 'string',
                    enum: ['PAYMENT_PENDING', 'UNPAID', 'PAID'],
                    example: 'PAID'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Payment status updated successfully' }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders & Kitchen Display (KOT)'],
        summary: 'Get single order details by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Order details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    order: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // =========================================================================
    // 5. WHATSAPP & QR GATEWAY
    // =========================================================================
    '/api/whatsapp/status': {
      get: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Get WhatsApp Web connection and pairing status',
        responses: {
          200: {
            description: 'Connection status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    isConnected: { type: 'boolean', example: true },
                    status: { type: 'string', example: 'CONNECTED' },
                    pairingQr: { type: 'string', nullable: true },
                    adminWhatsAppNumber: { type: 'string', example: '+91 99175 95999' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whatsapp/pair': {
      post: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Force refresh WhatsApp Web pairing QR code',
        responses: {
          200: { description: 'Pairing session initialized' }
        }
      }
    },
    '/api/whatsapp/disconnect': {
      post: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Unlink Admin WhatsApp Web device',
        responses: {
          200: { description: 'WhatsApp device unlinked successfully' }
        }
      }
    },
    '/api/whatsapp/config': {
      get: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Get centralized WhatsApp gateway configuration',
        responses: {
          200: {
            description: 'Gateway settings (tokens masked)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    config: {
                      type: 'object',
                      properties: {
                        adminWhatsAppNumber: { type: 'string', example: '+91 91212 66269' },
                        provider: { type: 'string', enum: ['sandbox', 'meta', 'twilio'], example: 'sandbox' },
                        connectionStatus: { type: 'string' },
                        lastTestedAt: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Update centralized WhatsApp gateway configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['adminWhatsAppNumber', 'provider'],
                properties: {
                  adminWhatsAppNumber: { type: 'string', example: '+91 91212 66269' },
                  provider: { type: 'string', enum: ['sandbox', 'meta', 'twilio'], example: 'sandbox' },
                  meta: {
                    type: 'object',
                    properties: {
                      phoneNumberId: { type: 'string' },
                      accessToken: { type: 'string' }
                    }
                  },
                  twilio: {
                    type: 'object',
                    properties: {
                      accountSid: { type: 'string' },
                      authToken: { type: 'string' },
                      fromNumber: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Gateway configuration updated successfully' }
        }
      }
    },
    '/api/whatsapp/outbox': {
      get: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Audit log of dispatched WhatsApp QR messages',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          200: {
            description: 'List of dispatched WhatsApp messages',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 47 },
                    outbox: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          from: { type: 'string', example: '+91 99175 95999' },
                          to: { type: 'string', example: '9884409984' },
                          userName: { type: 'string', example: 'Dr. Rajesh Kumar' },
                          qrId: { type: 'string' },
                          qrPayload: { type: 'string' },
                          qrImage: { type: 'string' },
                          timestamp: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whatsapp/tokens': {
      get: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Inspect active & historical Lifetime QR tokens',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          200: {
            description: 'List of lifetime tokens',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer' },
                    tokens: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string' },
                          revoked: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whatsapp/test': {
      post: {
        tags: ['WhatsApp & QR Gateway'],
        summary: 'Send test WhatsApp message',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to'],
                properties: {
                  to: { type: 'string', example: '+91 98888 88888' },
                  message: { type: 'string', example: 'Testing Canteen Services WhatsApp gateway delivery...' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Test message dispatched successfully' }
        }
      }
    },

    // =========================================================================
    // 6. SYSTEM & SEARCH PROXY
    // =========================================================================
    '/search-officer': {
      get: {
        tags: ['System & Search Proxy'],
        summary: 'Search Google Images via SerpApi proxy',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string', example: 'Masala Dosa' } }
        ],
        responses: {
          200: {
            description: 'Online image search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    name: { type: 'string' },
                    images: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          thumbnail: { type: 'string' },
                          original: { type: 'string' },
                          title: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/': {
      get: {
        tags: ['System & Search Proxy'],
        summary: 'Backend server root diagnostics and database status',
        responses: {
          200: {
            description: 'Server status and live statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'active' },
                    service: { type: 'string', example: 'IAS Officers Canteen API' },
                    database: { type: 'string', example: 'Connected (MongoDB Active)' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
