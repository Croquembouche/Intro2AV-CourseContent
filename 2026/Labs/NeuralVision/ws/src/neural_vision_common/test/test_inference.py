"""Independent numeric contracts, including held-out PyTorch reference outputs."""
from pathlib import Path
import numpy as np
import pytest
from neural_vision_common.inference import Network, MODELS

MODELS_DIR = Path(__file__).resolve().parents[1] / 'models'

@pytest.mark.parametrize('name',MODELS)
def test_matches_pytorch_reference_logits(name):
    model = Network(name,MODELS_DIR)
    with np.load(MODELS_DIR / (name+'_reference.npz')) as data:
        actual=np.stack([model.forward(x)['logits'] for x in data['inputs']])
        np.testing.assert_allclose(actual,data['logits'],atol=2e-5,rtol=2e-5)
        np.testing.assert_array_equal(actual.argmax(1),data['logits'].argmax(1))

def sample():
    with np.load(MODELS_DIR/'cnn_reference.npz') as data:
        return data['inputs'][0].reshape(28,28)

def test_local_products_padding_and_max_pool():
    model=Network('cnn',MODELS_DIR); x=sample(); d=model.forward(x)['detail']
    padded=np.pad(x,2)
    for f,y,z in [(0,0,0),(1,14,12),(5,27,27)]:
        expected=sum(float(padded[y+i,z+j])*float(model.w['conv1.weight'][f,0,i,j]) for i in range(5) for j in range(5))+float(model.w['conv1.bias'][f])
        assert abs(expected-float(d['conv1'][f,y,z]))<1e-5
    assert d['pool1'].shape==(6,14,14)
    assert d['pool2'].shape==(16,5,5)
    assert d['pool1'][1,3,4]==max(d['relu1'][1,6:8,8:10].flatten())

def test_neuron_sum_and_ablation():
    model=Network('mlp',MODELS_DIR); x=sample(); d=model.forward(x)['detail']
    expected=sum(float(a)*float(b) for a,b in zip(x.flatten(),model.w['fc1.weight'][10]))+float(model.w['fc1.bias'][10])
    assert abs(expected-float(d['pre1'][10]))<1e-5
    changed=model.forward(x,disabled_neuron=10)['detail']
    assert changed['hidden1'][10]==0
    np.testing.assert_array_equal(changed['hidden1'][:10],d['hidden1'][:10])

def test_attention_is_normalized_qk_and_weighted_values():
    model=Network('transformer',MODELS_DIR); result=model.forward(sample())
    for b in result['detail']['blocks']:
        np.testing.assert_allclose(b['attention'].sum(-1),1,atol=1e-6)
        head,query,dimension=1,7,3
        scores=np.array([sum(float(q)*float(k) for q,k in zip(b['q'][head,query],key))/4 for key in b['k'][head]])
        expected=np.exp(scores-scores.max());expected/=expected.sum()
        np.testing.assert_allclose(expected,b['attention'][head,query],atol=1e-6)
        mixture=sum(float(a)*float(v) for a,v in zip(expected,b['v'][head,:,dimension]))
        assert abs(mixture-b['mixed'][head,query,dimension])<1e-5
    changed=model.forward(sample(),use_positions=False)
    assert not np.allclose(changed['logits'],result['logits'])

@pytest.mark.parametrize('value',[float('nan'),float('inf'),-1.,2.])
def test_rejects_invalid_input_values(value):
    with pytest.raises(ValueError):
        Network('mlp',MODELS_DIR).forward(np.full((28,28),value))
