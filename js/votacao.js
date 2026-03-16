// js/votacao.js
import { firebase, db } from './firebase.js';
import { showToast } from './ui.js';
import { obterLocalizacao } from './geo.js';

const config = {
    pontosParaVerificar: 50,
    pontosParaRemover:   -30,
    pesoLocalizacao:     2.0,
    pesoBase:            1.0,
    penalidadeReport:    10,
    limiteReports:       5
};

export async function voteOnNews(noticiaId, tipoVoto, usuario, btn = null) {
    if (!usuario) { showToast('Faça login para votar.', 'error'); return false; }

    const originalHTML = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...'; }

    try {
        const noticiaRef = db.collection('noticias').doc(noticiaId);
        const noticiaDoc = await noticiaRef.get();
        if (!noticiaDoc.exists) { showToast('Notícia não encontrada.', 'error'); return false; }

        const noticia = noticiaDoc.data();
        if (noticia.autor.id === usuario.uid) { showToast('Você não pode votar na sua própria notícia.', 'error'); return false; }
        if (noticia.votos?.usuarios?.[usuario.uid]) { showToast('Você já votou nesta notícia.', 'error'); return false; }

        const loc    = await obterLocalizacaoSilenciosa();
        const peso   = calcularPeso(loc, noticia);
        const delta  = tipoVoto === 'positivo' ? peso : -peso;
        const campo  = tipoVoto === 'positivo' ? 'votos.positivos' : 'votos.negativos';

        await noticiaRef.update({
            [campo]: firebase.firestore.FieldValue.increment(delta),
            [`votos.usuarios.${usuario.uid}`]: { tipo: tipoVoto, peso, timestamp: firebase.firestore.FieldValue.serverTimestamp() }
        });
        await atualizarPontuacao(noticiaRef);
        showToast('Voto registrado!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao votar:', error);
        showToast('Erro ao registrar voto.', 'error');
        return false;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
    }
}

export async function reportNews(noticiaId, motivo, usuario) {
    if (!usuario) { showToast('Faça login para reportar.', 'error'); return false; }

    try {
        const existente = await db.collection('reports')
            .where('noticiaId', '==', noticiaId)
            .where('usuarioId', '==', usuario.uid)
            .where('resolvido', '==', false)
            .limit(1).get();
        if (!existente.empty) { showToast('Você já reportou esta notícia.', 'error'); return false; }

        const batch      = db.batch();
        const noticiaRef = db.collection('noticias').doc(noticiaId);
        batch.set(db.collection('reports').doc(), {
            noticiaId, usuarioId: usuario.uid, motivo,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), resolvido: false
        });
        batch.update(noticiaRef, {
            pontuacao:   firebase.firestore.FieldValue.increment(-config.penalidadeReport),
            reportCount: firebase.firestore.FieldValue.increment(1)
        });
        await batch.commit();

        const doc = await noticiaRef.get();
        if (doc.exists && (doc.data().reportCount || 0) >= config.limiteReports) {
            await noticiaRef.update({ status: 'removida' });
        }
        return true;
    } catch (error) {
        console.error('Erro ao reportar:', error);
        showToast('Erro ao enviar report.', 'error');
        return false;
    }
}

export async function checkUserVote(noticiaId, usuarioId) {
    try {
        const doc = await db.collection('noticias').doc(noticiaId).get();
        if (!doc.exists) return null;
        return doc.data().votos?.usuarios?.[usuarioId] || null;
    } catch (_) { return null; }
}

async function obterLocalizacaoSilenciosa() {
    try { return await obterLocalizacao(); } catch (_) { return null; }
}

function calcularPeso(loc, noticia) {
    if (loc && noticia.localizacaoCoords) {
        const dist = haversine(loc, noticia.localizacaoCoords);
        if (dist !== null && dist < 50) return config.pesoLocalizacao;
    }
    return config.pesoBase;
}

function haversine(a, b) {
    if (!a || !b) return null;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 + Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function atualizarPontuacao(noticiaRef) {
    try {
        const snap = await noticiaRef.get();
        if (!snap.exists) return;
        const { votos, autor } = snap.data();
        let pontuacao = (votos?.positivos || 0) - (votos?.negativos || 0);
        if (autor?.reputacao) pontuacao += autor.reputacao * 0.1;
        let status = 'averiguar';
        if (pontuacao >= config.pontosParaVerificar) status = 'verificada';
        else if (pontuacao <= config.pontosParaRemover) status = 'removida';
        await noticiaRef.update({ pontuacao, status });
    } catch (err) { console.error('Erro ao atualizar pontuação:', err); }
}
