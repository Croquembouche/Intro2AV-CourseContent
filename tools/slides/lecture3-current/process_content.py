"""Narration for animations that expose changes in data and computation."""

REVISIONS = {
    5: (
        'Prediction error changes weights, which changes the next prediction',
        'Follow the same digit 3 through a schematic training update. The first prediction gives class 1 a larger score. An error packet returns, the weight dials turn, and another forward pass produces different scores. The dials stand for learned weights throughout the network, not a two-weight model. Scores and dial movements are illustrative, not measured results. Loss measures error; backpropagation computes how the loss depends on weights; an optimizer makes small updates. A particular update need not improve every example. At inference, the learned weights normally stay fixed.',
    ),
    6: (
        'New pixels create inputs, and each input needs connections',
        'Watch four pixels become eight: first the image grows, then four input nodes appear, then their connections appear. The same three hidden nodes remain. Four inputs need twelve first-layer weights; eight inputs need twenty-four. This count excludes biases. The animation changes the network design, not its weights during training. It motivates asking whether every distant pixel is needed to detect a small local pattern.',
    ),
    7: (
        'Each pixel is weighted, then the nine contributions are added',
        'The animation exposes one local filter application. Pixel rows are 0,0,0; 1,1,1; 1,1,1. Filter rows are -1,-1,-1; 0,0,0; 1,1,1. Multiplying corresponding values produces rows 0,0,0; 0,0,0; 1,1,1, whose sum is 3. The displayed weights are a deliberately simple illustrative filter; a trained network learns filter weights from examples. Students need only see nearby pixel values become one response, not calculate every cell. The input image still retains all its pixels. A response is evidence for a pattern, not an object category. Local receptive fields helped inspire early neural vision models, including Neocognitron in 1980.',
    ),
    10: (
        'Two filters build different response maps from the same image',
        'Two simple 2-by-2 filters expose what changes when the weights differ. The same 4-by-4 input stays fixed while each output map fills. Filter A uses rows 1,0 and 1,0; filter B uses rows 1,1 and 0,0. These small illustrative filters are used for readability. A final map is rows 0,2,0; 1,2,1; 1,1,1. B is rows 1,1,0; 1,1,0; 2,2,1. Selected stages omit intervening window positions. Moving one filter reuses its weights; using a second filter adds another set of weights. Actual learned channels need not correspond to a named human feature. Filters can be computed in parallel.',
    ),
    14: (
        'Responses accumulate, pooling reduces them, and the head produces scores',
        'Trace the actual state changes in a schematic forward pass. Filter response maps fill with values, spatial pooling produces smaller maps, subsequent processing combines features, and the prediction head produces class scores. Digit 3 has the largest final score in this illustrative example. The diagrams do not encode a measured model or a literal cell-by-cell calculation. Weights remain fixed during this forward pass. Activations are omitted for visual simplicity and introduced next. LeNet demonstrates handwriting recognition; AlexNet later scaled learned representations to natural images with data, GPUs and training improvements.',
    ),
    15: (
        'Values pass through ReLU and fill the output map',
        'Watch individual filter responses pass through the activation and populate an output grid. Input rows are 2,-1,3 and -2,1,-3. Positive values pass through unchanged; negative values become zero. The completed output is 2,0,3 and 0,1,0. The input responses stay visible as a reference. This is an elementwise transformation, not permanent deletion of weights or connections. The sequence is slowed for teaching; all elements can be processed in parallel. ReLU adds a nonlinear response rule. Backpropagation and an optimizer perform the weight updates.',
    ),
    16: (
        'The input changes while both activation outputs update',
        'The marker moves through negative, zero and positive input values. Read the two current outputs together. ReLU remains zero for negative inputs. Leaky ReLU uses an illustrative fixed slope of 0.1 there: -3 gives -0.3, -2 gives -0.2, and -1 gives -0.1. Both return the input when it is positive. These changing outputs show sensitivity, not a training simulation. If a unit stays negative across relevant examples, a flat ReLU can block the local learning signal through that activation. One negative response does not mean a dead unit. Leaky ReLU preserves a nonzero negative-side derivative; it does not guarantee better learning. PReLU learns its slope instead.',
    ),
    19: (
        'The input travels along a shortcut and adds to a learned correction',
        'Follow concrete feature values through the two paths. Input [2,1] stays unchanged on the shortcut. The other branch computes an illustrative correction [0,1]. The addition produces [2,2]. These are successive stages of one forward pass, not training iterations. A real block learns the correction from training; this example only shows what the shortcut preserves and how addition combines the two paths. Deeper plain networks can be harder to optimize even with more capacity. ResNet helps very deep networks learn; it is not solely a remedy for overfitting or vanishing gradients. Historical anchor: 2015 preprint, CVPR 2016.',
    ),
    20: (
        'Coarse context expands to the finer grid, then combines with local detail',
        'The coarse 2-by-2 map contains one active cell. Nearest-neighbor upsampling copies it into four cells of a 4-by-4 grid. The finer map contains two localized responses. Copies of the two maps reach the addition, producing a combined map with broad context, stronger overlapping evidence, and the separate fine response. This illustrates the top-down upsampling and lateral addition in a feature pyramid; channel projections and later smoothing operations are omitted. Repeat the mechanism across levels to connect the hierarchy. FPN addresses scale, distinct from the optimization problem of ResNet. Combining features cannot restore evidence that the sensor never captured.',
    ),
    26: (
        'Image patches become feature vectors with position information',
        'Watch one digit image split into four spatial patches. The separated patches pass through a learned embedding and become feature vectors; position information is added. The colors and vector entries are illustrative, not outputs of a trained ViT. Each patch is an image region, not an independent digit or necessarily a complete object. Four patches keep the demonstration readable. Original ViT embeds nonoverlapping patches and adds learned position embeddings. The implementation can embed all patches in parallel; the sequence separates their movement for teaching.',
    ),
    27: (
        'An illustrative attention update for one feature of one query patch',
        'The animation begins after the query has compared with the available patch features and produced attention weights. For one component of the value vectors, patches A, B and C supply 4, 2 and 0. Illustrative weights 0.6, 0.3 and 0.1 sum to one. Multiplication gives contributions 2.4, 0.6 and 0. These move to the addition and produce 3.0. The full attention output repeats this weighted combination across feature components. The values are not class probabilities, object labels or measured attention. Learned query/key projections produce input-dependent weights; learned value projections provide the features to combine. A token can also contribute to its own update.',
    ),
    32: (
        'Shifted windows let information cross an earlier boundary',
        'A and B remain at fixed image positions while their window grouping changes. They begin in separate 2-by-2 windows. After the shift they share the central window, and feature packets can pass between them. Their displayed vectors change from [1,0] and [0,1] to illustrative mixtures [0.7,0.3] and [0.3,0.7]. These values illustrate information mixing, not a measured Swin block; other tokens and full block operations are omitted. The window grouping shifts between successive layers, not continuously during one attention calculation. Edge masking is omitted. Cross-window communication develops across layers; patch merging builds coarser levels.',
    ),
}


def apply_process_revision(content):
    for slide in content:
        if slide['slide'] in REVISIONS:
            caption, notes = REVISIONS[slide['slide']]
            slide.update(layout='figure', caption=caption, notes=notes)
