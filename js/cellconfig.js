// =========== CELL CONFIGURATIONS ===========
// Define core visualization layouts and cell types
// - Image cell mappings
// - Chart type definitions
// - Cell organization
export const cellConfigs = {
    // Image cell mappings to image files
    images: {
        0: 'pic1.jpeg',     // Introduction image
        1: 'anki.png',      // Anki app screenshot
        2: 'cat.png',       // Category visualization
        5: 'srs.png',        // Spaced repetition system
        8: 'done.png'       // Final slide!
    },
    
    // Chart type assignments for different sections
    charts: {
        3: 'waffleChart',           // Word category distribution
        4: 'stackedBar',            // Part of speech analysis
        6: 'wordPerformanceChart',  // Review performance metrics
        7: 'heatmap'                // Time-based review patterns
    }
};

// =========== COLOR SCHEMES ===========
// Define consistent color palettes for visualizations
// - Core categorical colors for different data types
// - UI element colors
// - Sequential color scales
export const colors = {
    // Categorical colors for different parts of speech
    pos: {
        'noun': '#4e79a7',          // Blue for nouns
        'verb': '#e15759',          // Red for verbs
        'adj': '#f28e2c',           // Orange for adjectives
        'adv': '#59a14f',           // Green for adverbs
        'verbial noun': '#76b7b2',  // Teal for verbal nouns
        'phrase': '#edc949'         // Yellow for phrases
    },
    
    // UI element colors
    ui: {
        lightGrey: '#e2e8f0',       // Background, disabled states
        darkGrey: '#6b7280'         // Text, borders, lines
    }
};

// =========== TEXT MAPPINGS ===========
// Define text transformations and labels
// - Part of speech labels
// - Plural forms
// - Abbreviated versions
export const posMap = {
    // Standard labels
    labels: {
        'noun': 'Noun',
        'verb': 'Verb',
        'adj': 'Adjective',
        'adv': 'Adverb',
        'verbial noun': 'Verbal Noun',
        'phrase': 'Phrase'
    },
    
    // Plural forms for aggregations
    plural: {
        'noun': 'nouns',
        'verb': 'verbs',
        'adj': 'adjectives',
        'adv': 'adverbs',
        'verbial noun': 'verbal nouns',
        'phrase': 'phrases'
    },
    
    // Abbreviated forms for space-constrained displays
    abbreviated: {
        'noun': 'Nouns',
        'verb': 'Verbs',
        'adj': 'Adj',
        'adv': 'Adv',
        'verbial noun': 'V. Nouns',
        'phrase': 'Phrases'
    }
};

// =========== CATEGORY DEFINITIONS ===========
// Define category metadata and descriptions
// - Category names and codes
// - Detailed descriptions
// - Layout parameters
export const categoryMap = {
    // Category display names
    names: {
        'DL': 'Daily Life',
        'PR': 'People & Relationships',
        'PT': 'Places & Travel',
        'AA': 'Actions & Activities',
        'BH': 'Body & Health',
        'TN': 'Time & Numbers',
        'NE': 'Nature & Environment',
        'AC': 'Abstract Concepts'
    },
    
    // Detailed category descriptions
    descriptions: {
        'DL': 'Everyday vocab, including things like food, clothing, and household items.',
        'PR': 'People-specific words, such as occupations.',
        'PT': 'Vocab that involves locations or movement.',
        'AA': 'Common verbs, sports, and activities.',
        'BH': 'Vocab regarding health and body parts.',
        'TN': 'Expressions on time and numbers, such as dates.',
        'NE': 'Words related to nature and the environment such as animals.',
        'AC': 'Abstract and conceptual terms that cannot be categorized.'
    },
    
    // Tooltip width configurations for different categories
    tooltipWidths: {
        'DL': 400,
        'PR': 240,
        'PT': 240,
        'AA': 210,
        'BH': 220,
        'TN': 270,
        'NE': 340,
        'AC': 325
    }
};

// =========== LEGEND CONFIGURATION ===========
// Define legend appearance and behavior
// - Legend items and colors
// - Layout parameters
// - Styling options
export const legendConfig = {
    // Legend item definitions
    items: [
        { label: 'Noun', color: colors.pos.noun },
        { label: 'Verb', color: colors.pos.verb },
        { label: 'Verbal Noun', color: colors.pos['verbial noun'] },
        { label: 'Adjective', color: colors.pos.adj },
        { label: 'Adverb', color: colors.pos.adv },
        { label: 'Phrase', color: colors.pos.phrase }
    ],
    
    // Layout settings
    layout: {
        itemsPerRow: 6,
        itemWidth: 100,
        squareSize: 12,
        fontSize: '12px'
    }
};

// =========== UI CONFIGURATION ===========
// Define common UI parameters
// - Margins and spacing
// - Animation settings
// - Date formatting
export const uiConfig = {
    // Standard margins for visualizations
    margins: {
        top: 55,
        right: 40,
        bottom: 150,
        left: 200
    },
    
    // Transition configurations
    transitions: {
        duration: 500,
        delay: 20
    },
    
    // Date formatting function
    dateFormat: d3.timeFormat('%B %d, %Y')
};

// =========== MILESTONE CONFIGURATION ===========
// Define milestone-related settings
// - Week breakpoints
// - Milestone descriptions
// - Timeline markers
export const milestoneConfig = {
    // Week markers for significant events
    weeks: [0, 1, 5, 11, 14, 17, 21, 25],
    
    // Milestone descriptions
    descriptions: {
        0: "I've separated the words learned into 8 categories. Hover for more context!",
        1: "I started my journey in June learning 150 essential conversation phrases from Ninjapanese, a Japanese language youtuber.",
        5: "I then went to learn about common verbs from Ninjapanese.",
        11: "After that, I also did common adjectives!",
        14: "School starts! I joined JCC, the Japanese conversation club where I practiced my horrible spoken Japanese.",
        17: "There I made friends with an exchange student named Shoyo. We went to Banff in mid-October and went hiking!",
        21: "In November, we drove to the Athabasca Glacier and Jasper.",
        25: "As of now, I'm continuing JCC nights and started playing Animal Crossing in Japanese!"
    }
};