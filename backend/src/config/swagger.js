const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Government Canteen & Officers Mess API',
    version: '2.0.0',
    description: `
### Overview
Comprehensive RESTful API for the **Government Canteen Services & Kitchen Order Ticket (KOT) POS System**.

### Key Modules:
- **Authentication & QR Passkeys**: Officer registration, camera-based QR login, admin credentials, user profile management.
- **Food & Inventory Management**: Menu catalog, diet filters (Veg/Non-Veg), short-order short-listing, live stock toggling.
- **Cart & Pre-ordering**: Session & token-based shopping cart management.
- **KOT Kitchen Orders & Lifecycle**:
  - **Stage 1**: \`NEW\` / \`PENDING\` (Order placed, waiting for kitchen prep)
  - **Stage 2**: \`PREPARING\` (Kitchen actively cooking dish)
  - **Stage 3**: \`READY\` (Dish cooked, ready for officer counter pickup)
  - **Stage 4**: \`COMPLETED\` (Dish picked up/fulfilled, payment cleared)
  - **Exception**: \`CANCELLED\` (Order rejected or voided)
- **Payment & Settlement**: Outstanding balance tracking, dynamic UPI QR generation, consolidated dues settlement, automatic thermal bill printing & WhatsApp PDF bill dispatch.
- **WhatsApp Web Service**: Live WhatsApp Web pairing QR, automatic notifications, PDF bill attachments, outbox audit log.
- **Officer Media Search**: Fast officer profile photo discovery via SerpApi, Wikimedia, and live image search.
    `,
    contact: {
      name: 'Mess & Canteen Technical Operations',
      email: 'support@restaurants.stackvil.com',
    },
    license: {
      name: 'Proprietary - Government Canteen Management System',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server',
    },
    {
      url: 'http://192.168.2.101:5001',
      description: 'Local Wi-Fi / LAN Network Server',
    },
    {
      url: 'https://restaurants.stackvil.com',
      description: 'Production Cloudflare Tunnel Server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Officer & Admin user accounts, Passkey QR login, and profile management',
    },
    {
      name: 'Food Menu',
      description: 'Dish items, pricing, categories, out-of-stock toggles, and photo upload',
    },
    {
      name: 'Shopping Cart',
      description: 'Pre-ordering cart items, quantities, and real-time total calculations',
    },
    {
      name: 'Orders & KOT Lifecycle',
      description: 'Kitchen Order Tickets (KOT), status flow (NEW -> PREPARING -> READY -> COMPLETED), UPI QR, and dues settlement',
    },
    {
      name: 'Prebooking & Time Slots',
      description: 'Dining time slot generation, cutoff checking, capacity tracking, and pre-order scheduling',
    },
    {
      name: 'WhatsApp & QR Services',
      description: 'WhatsApp Web pairing, automated message dispatch, invoice PDFs, and token inspection',
    },
    {
      name: 'Officer Media Search',
      description: 'Automated officer photo search using SerpApi and image search providers',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr_987216' },
          name: { type: 'string', example: 'Dr. Rajesh Kumar' },
          email: { type: 'string', example: 'rajesh.kumar@gov.in' },
          phone: { type: 'string', example: '+919876543210' },
          role: { type: 'string', enum: ['OFFICER', 'ADMIN', 'STAFF'], example: 'OFFICER' },
          serviceCadre: { type: 'string', example: 'IAS - AGMUT Cadre' },
          roomNumber: { type: 'string', example: 'Suite 204, Officers Mess' },
          batch: { type: 'string', example: '2018 Batch' },
          qrCode: { type: 'string', description: 'Base64 Data URL of officer login QR code' },
          qrToken: { type: 'string', example: 'QR-PASSKEY-882194' },
          profilePhoto: { type: 'string', example: 'https://restaurants.stackvil.com/uploads/officer-101.jpg' },
        },
      },
      FoodItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'food_dosa_01' },
          name: { type: 'string', example: 'Ghee Special Masala Dosa' },
          category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages'], example: 'breakfast' },
          subCategory: { type: 'string', example: 'South Indian' },
          price: { type: 'number', example: 75 },
          isVeg: { type: 'boolean', example: true },
          isAvailable: { type: 'boolean', example: true },
          availableQuantity: { type: 'number', example: 50 },
          portion: { type: 'string', example: 'Served with 2 Chutneys & Sambar' },
          image: { type: 'string', example: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc' },
        },
      },
      OrderItem: {
        type: 'object',
        required: ['foodId', 'quantity'],
        properties: {
          foodId: { type: 'string', example: 'food_dosa_01' },
          name: { type: 'string', example: 'Ghee Special Masala Dosa' },
          price: { type: 'number', example: 75 },
          quantity: { type: 'integer', minimum: 1, example: 2 },
          spicy: { type: 'boolean', example: false },
        },
      },
      PreOrderSlot: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'lunch_1230_1300' },
          slotId: { type: 'string', example: 'lunch_1230_1300' },
          label: { type: 'string', example: '12:30 PM - 01:00 PM' },
          mealSlot: { type: 'string', enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], example: 'Lunch' },
          category: { type: 'string', example: 'lunch' },
          startTime: { type: 'string', example: '12:30 PM' },
          endTime: { type: 'string', example: '01:00 PM' },
          date: { type: 'string', example: '2026-09-28' },
          isAvailable: { type: 'boolean', example: true },
          status: { type: 'string', enum: ['AVAILABLE', 'CUTOFF_PASSED', 'FULL', 'EXPIRED'], example: 'AVAILABLE' },
          unavailableReason: { type: 'string', nullable: true, example: null },
          maxCapacity: { type: 'number', example: 50 },
          bookedCount: { type: 'number', example: 3 },
          remainingCapacity: { type: 'number', example: 47 },
        },
      },
      SlotsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          selectedDate: { type: 'string', example: '2026-09-28' },
          isToday: { type: 'boolean', example: true },
          availableDates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', example: '2026-09-28' },
                dayName: { type: 'string', example: 'Mon' },
                formatted: { type: 'string', example: '28 Sep 2026' },
                label: { type: 'string', example: 'Today (28 Sep 2026)' },
              },
            },
          },
          totalSlots: { type: 'number', example: 22 },
          availableSlotsCount: { type: 'number', example: 16 },
          slots: {
            type: 'array',
            items: { $ref: '#/components/schemas/PreOrderSlot' },
          },
          groupedSlots: {
            type: 'object',
            properties: {
              Breakfast: { type: 'array', items: { $ref: '#/components/schemas/PreOrderSlot' } },
              Lunch: { type: 'array', items: { $ref: '#/components/schemas/PreOrderSlot' } },
              Snacks: { type: 'array', items: { $ref: '#/components/schemas/PreOrderSlot' } },
              Dinner: { type: 'array', items: { $ref: '#/components/schemas/PreOrderSlot' } },
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ORD-9821' },
          orderNumber: { type: 'string', example: 'ORD-9821' },
          tokenNumber: { type: 'string', example: '042' },
          userId: { type: 'string', example: 'usr_987216' },
          userName: { type: 'string', example: 'Dr. Rajesh Kumar (IAS)' },
          userPhone: { type: 'string', example: '+919876543210' },
          orderType: { type: 'string', enum: ['INSTANT', 'PRE_ORDER', 'Dine In', 'Takeaway'], example: 'PRE_ORDER' },
          isPreOrder: { type: 'boolean', example: true },
          pickupDate: { type: 'string', format: 'date-time', example: '2026-09-28T12:30:00.000Z' },
          pickupTime: { type: 'string', example: '12:30 PM - 01:00 PM' },
          slotId: { type: 'string', example: 'lunch_1230_1300' },
          preOrderSlot: { type: 'string', example: '12:30 PM - 01:00 PM' },
          mealSlot: { type: 'string', example: 'Lunch' },
          table: { type: 'string', example: 'Table 4 / Counter Pickup' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          status: {
            type: 'string',
            enum: ['NEW', 'PRE_ORDERED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            description: '4-Stage Kitchen Lifecycle Status',
            example: 'PRE_ORDERED',
          },
          kitchenStatus: {
            type: 'string',
            enum: ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            example: 'NEW',
          },
          paymentStatus: {
            type: 'string',
            enum: ['UNPAID', 'PENDING', 'PAID', 'COMPLETED'],
            example: 'UNPAID',
          },
          paymentMethod: { type: 'string', example: 'UPI' },
          totalAmount: { type: 'number', example: 150 },
          orderNote: { type: 'string', example: 'Crispy dosa with extra sambar' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          foodId: { type: 'string', example: 'food_dosa_01' },
          name: { type: 'string', example: 'Ghee Special Masala Dosa' },
          price: { type: 'number', example: 75 },
          quantity: { type: 'integer', minimum: 1, example: 2 },
          image: { type: 'string', example: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc' },
          itemTotal: { type: 'number', example: 150 },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: 'usr_987216' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' },
          },
          totalItems: { type: 'number', example: 2 },
          grandTotal: { type: 'number', example: 150 },
        },
      },
      WhatsAppConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', example: true },
          phoneNumberId: { type: 'string', example: '1098273645123' },
          autoSendOnPaid: { type: 'boolean', example: true },
          sendPdfInvoice: { type: 'boolean', example: true },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new officer or user (Generates instant QR Passkey)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone', 'password'],
                properties: {
                  name: { type: 'string', example: 'Dr. Rajesh Kumar' },
                  email: { type: 'string', example: 'rajesh.kumar@gov.in' },
                  phone: { type: 'string', example: '+919876543210' },
                  password: { type: 'string', example: 'Secret@123' },
                  serviceCadre: { type: 'string', example: 'IAS' },
                  roomNumber: { type: 'string', example: 'Suite 204' },
                  batch: { type: 'string', example: '2018' },
                  profilePhoto: { type: 'string', example: '' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully with QR Passkey and JWT token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Officer password-based login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'password'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                  password: { type: 'string', example: 'Secret@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/qr-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Instant QR Passkey Camera Authentication',
        description: 'Scans the physical officer QR ID card and automatically logs in without typing password.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrToken'],
                properties: {
                  qrToken: { type: 'string', example: 'QR-PASSKEY-882194' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Officer verified & authenticated via QR',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/profile': {
      put: {
        tags: ['Authentication'],
        summary: 'Update authenticated officer profile & photo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Dr. Rajesh Kumar' },
                  serviceCadre: { type: 'string', example: 'IAS' },
                  roomNumber: { type: 'string', example: 'Suite 204' },
                  batch: { type: 'string', example: '2018' },
                  profilePhoto: { type: 'string', example: 'https://restaurants.stackvil.com/uploads/photo.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
          },
        },
      },
    },
    '/api/auth/admin/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Admin dashboard login via credentials',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@canteen.gov.in' },
                  password: { type: 'string', example: 'Admin@2026' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Admin authenticated' },
        },
      },
    },
    '/api/foods': {
      get: {
        tags: ['Food Menu'],
        summary: 'List available canteen dishes with dietary & category filters',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks'] } },
          { name: 'subCategory', in: 'query', schema: { type: 'string' } },
          { name: 'isVeg', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Keyword search for dish name' },
        ],
        responses: {
          200: {
            description: 'List of active food items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 12 },
                    food: { type: 'array', items: { $ref: '#/components/schemas/FoodItem' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Food Menu'],
        summary: 'Admin: Add a new dish to the canteen catalog',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FoodItem' },
            },
          },
        },
        responses: {
          201: { description: 'Food item created successfully' },
        },
      },
    },
    '/api/foods/admin': {
      get: {
        tags: ['Food Menu'],
        summary: 'Admin & Kitchen: List all food items including sold-out dishes',
        responses: {
          200: { description: 'Full menu item list' },
        },
      },
    },
    '/api/foods/{id}': {
      get: {
        tags: ['Food Menu'],
        summary: 'Get dish details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Food item found' },
          404: { description: 'Dish not found' },
        },
      },
      put: {
        tags: ['Food Menu'],
        summary: 'Admin & Kitchen: Edit dish pricing, portion, or toggle Out of Stock',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  isAvailable: { type: 'boolean', description: 'Toggle In Stock / Out of Stock' },
                  availableQuantity: { type: 'number' },
                  name: { type: 'string' },
                  image: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Dish updated successfully' },
        },
      },
      delete: {
        tags: ['Food Menu'],
        summary: 'Admin: Delete dish from catalog',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Dish deleted' },
        },
      },
    },
    '/api/foods/upload': {
      post: {
        tags: ['Food Menu'],
        summary: 'Admin: Upload dish photo (Base64)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['imageBase64'],
                properties: {
                  imageBase64: { type: 'string' },
                  imageName: { type: 'string', example: 'dosa.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Photo uploaded with public URL returned' },
        },
      },
    },
    '/api/cart': {
      get: {
        tags: ['Shopping Cart'],
        summary: 'Get active officer cart with calculated totals',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    cart: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/cart/add': {
      post: {
        tags: ['Shopping Cart'],
        summary: 'Add dish item to cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['foodId', 'quantity'],
                properties: {
                  foodId: { type: 'string', example: 'food_dosa_01' },
                  quantity: { type: 'integer', minimum: 1, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Item added to cart' },
        },
      },
    },
    '/api/foods/slots': {
      get: {
        tags: ['Prebooking & Time Slots'],
        summary: 'Get available dining prebooking time slots (Breakfast, Lunch, Snacks, Dinner)',
        description: 'Returns available 30-minute interval dining slots for today or upcoming dates with real-time cutoff and capacity tracking.',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string' }, example: '2026-09-28', description: 'Target dining date (YYYY-MM-DD)' },
          { name: 'mealType', in: 'query', schema: { type: 'string', enum: ['all', 'breakfast', 'lunch', 'snacks', 'dinner'] }, description: 'Filter by meal session' },
        ],
        responses: {
          200: {
            description: 'List of available time slots grouped by meal category',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SlotsResponse' },
              },
            },
          },
        },
      },
    },
    '/api/orders/slots': {
      get: {
        tags: ['Prebooking & Time Slots'],
        summary: 'Get available dining prebooking time slots (Alias for /api/orders/prebook-slots)',
        description: 'Returns all available slots with cutoff detection and capacity status.',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string' }, example: '2026-09-28', description: 'Target dining date (YYYY-MM-DD)' },
          { name: 'mealType', in: 'query', schema: { type: 'string', enum: ['all', 'breakfast', 'lunch', 'snacks', 'dinner'] } },
        ],
        responses: {
          200: {
            description: 'Slots list and grouped meal windows payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SlotsResponse' },
              },
            },
          },
        },
      },
    },
    '/api/orders/prebook-slots': {
      get: {
        tags: ['Prebooking & Time Slots'],
        summary: 'Get prebooking time slots and upcoming 7-day calendar availability',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string' }, example: '2026-09-28' },
          { name: 'mealType', in: 'query', schema: { type: 'string', enum: ['all', 'breakfast', 'lunch', 'snacks', 'dinner'] } },
        ],
        responses: {
          200: {
            description: 'Available dining slots payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SlotsResponse' },
              },
            },
          },
        },
      },
    },
    '/api/orders/slots/validate': {
      post: {
        tags: ['Prebooking & Time Slots'],
        summary: 'Validate selected time slot availability before placing pre-order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  slotId: { type: 'string', example: 'lunch_1230_1300' },
                  pickupTime: { type: 'string', example: '12:30 PM - 01:00 PM' },
                  pickupDate: { type: 'string', example: '2026-09-28' },
                  mealSlot: { type: 'string', example: 'Lunch' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Slot validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    isValid: { type: 'boolean', example: true },
                    isAvailable: { type: 'boolean', example: true },
                    slot: { $ref: '#/components/schemas/PreOrderSlot' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders': {
      post: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Place new order (Instant Dine-In or Scheduled Pre-Order / Prebooking)',
        description: 'Creates an order ticket and dispatches real-time KOT via Socket.io and triggers thermal receipt print. Supports instant ordering and scheduled prebooking with selectable time slots.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  userName: { type: 'string', example: 'Dr. Rajesh Kumar' },
                  userPhone: { type: 'string', example: '+919876543210' },
                  orderType: { type: 'string', enum: ['INSTANT', 'PRE_ORDER', 'Dine In', 'Takeaway'], example: 'PRE_ORDER' },
                  isPreOrder: { type: 'boolean', example: true, description: 'True if pre-ordering for a scheduled slot' },
                  pickupDate: { type: 'string', format: 'date-time', example: '2026-09-28T12:30:00.000Z', description: 'Scheduled pickup date' },
                  pickupTime: { type: 'string', example: '12:30 PM - 01:00 PM', description: 'Selected prebooking time slot' },
                  slotId: { type: 'string', example: 'lunch_1230_1300', description: 'Selected time slot ID' },
                  preOrderSlot: { type: 'string', example: '12:30 PM - 01:00 PM' },
                  mealSlot: { type: 'string', enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'General'], example: 'Lunch' },
                  table: { type: 'string', example: 'Table 4 / Slot Pickup' },
                  items: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/OrderItem' },
                  },
                  orderNote: { type: 'string', example: 'Extra hot sambar, serve at slot time' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order placed successfully (Status: NEW/PRE_ORDERED / Payment: UNPAID)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    order: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Get user order history by query parameter or Bearer token',
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'phone', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of user orders' },
        },
      },
    },
    '/api/orders/my-orders': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Authenticated officer order history (Strict user isolation)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated officer orders' },
        },
      },
    },
    '/api/orders/unpaid': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Get unpaid orders and total outstanding balance',
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'phone', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Unpaid orders summary and dues balance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    totalUnpaidAmount: { type: 'number', example: 350 },
                    unpaidCount: { type: 'integer', example: 3 },
                    orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders/restaurant-qr': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Generate dynamic UPI QR Code for instant bill payment',
        parameters: [
          { name: 'amount', in: 'query', required: true, schema: { type: 'number' }, example: 350 },
          { name: 'orderIds', in: 'query', schema: { type: 'string' }, example: 'ORD-9821,ORD-9822' },
        ],
        responses: {
          200: {
            description: 'UPI dynamic QR Data URL returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    qrCode: { type: 'string', description: 'Base64 image/png data URL' },
                    upiUrl: { type: 'string', example: 'upi://pay?pa=mess.canteen@sbi&pn=Officers+Mess&am=350...' },
                    amount: { type: 'number', example: 350 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders/live-status': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Public active orders status feed for TV / Wall Display',
        responses: {
          200: { description: 'Live active preparing/ready orders list' },
        },
      },
    },
    '/api/orders/admin/all': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Admin & Kitchen: List all orders with filters',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] } },
          { name: 'paymentStatus', in: 'query', schema: { type: 'string', enum: ['UNPAID', 'PAID'] } },
        ],
        responses: {
          200: { description: 'Filtered orders array' },
        },
      },
    },
    '/api/orders/admin/stats': {
      get: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Kitchen & Canteen performance analytics',
        description: 'Returns today revenue, total orders count, pending KOT count, and average fulfillment duration.',
        responses: {
          200: { description: 'Aggregated analytics payload' },
        },
      },
    },
    '/api/orders/{id}/status': {
      put: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Update Kitchen Lifecycle Status',
        description: `
Executes 4-Stage transition:
- \`NEW\` -> \`PREPARING\` (Kitchen chef starts cooking)
- \`PREPARING\` -> \`READY\` (Dish is cooked, ready for officer pickup)
- \`READY\` -> \`COMPLETED\` (Dish handed over to officer)
- Any -> \`CANCELLED\` (Order rejected)

Broadcasts real-time Socket.io notification to officer tracking app immediately.
        `,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
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
                    enum: ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
                    example: 'PREPARING',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated and broadcasted' },
        },
      },
    },
    '/api/orders/{id}/payment-status': {
      put: {
        tags: ['Orders & KOT Lifecycle'],
        summary: 'Update Order Payment Status (UNPAID -> PAID)',
        description: 'Marks payment as PAID, triggers thermal receipt print, and dispatches invoice PDF via WhatsApp.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentStatus'],
                properties: {
                  paymentStatus: { type: 'string', enum: ['PAID', 'UNPAID'], example: 'PAID' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Payment marked PAID with receipt auto-dispatch' },
        },
      },
    },
    '/api/whatsapp/status': {
      get: {
        tags: ['WhatsApp & QR Services'],
        summary: 'Check WhatsApp Web connection state and current pairing QR',
        responses: {
          200: {
            description: 'Connection status payload',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    connected: { type: 'boolean', example: true },
                    phone: { type: 'string', example: '+919917595999' },
                    qrData: { type: 'string', description: 'Pairing QR string if disconnected' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/whatsapp/test': {
      post: {
        tags: ['WhatsApp & QR Services'],
        summary: 'Send test WhatsApp message to officer phone',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to'],
                properties: {
                  to: { type: 'string', example: '+919876543210' },
                  message: { type: 'string', example: 'Test message from Officers Mess Canteen Server.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Message queued and delivered' },
        },
      },
    },
    '/api/whatsapp/outbox': {
      get: {
        tags: ['WhatsApp & QR Services'],
        summary: 'Recent WhatsApp delivery outbox audit log',
        responses: {
          200: { description: 'Audit log of sent messages' },
        },
      },
    },
    '/search-officer': {
      get: {
        tags: ['Officer Media Search'],
        summary: 'Search verified officer photos via SerpApi & Wikimedia',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string' }, example: 'Rajesh Kumar IAS' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['IAS', 'IPS', 'IFS', 'OFFICER'] } },
        ],
        responses: {
          200: {
            description: 'Matching officer photos with confidence scores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    primaryPhoto: { type: 'string', example: 'https://images.unsplash.com/...' },
                    allPhotos: { type: 'array', items: { type: 'string' } },
                    source: { type: 'string', example: 'SerpApi Google Images' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerSpec,
  swaggerUi,
};
