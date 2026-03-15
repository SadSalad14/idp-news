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

// ─── Votação ──────────────────────────────────────────────────────────────────
export async function voteOnNews(noticiaId, tipoVoto, usuario, buttonElement = null) {
    if (!usuario) {
        showToast('Faça login para votar.', 'error');
        return false;
    }

    const originalHTML = buttonElement?.innerHTML;
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }

    try {
        const noticiaRef = db.collection('noticias').doc(noticiaId);
        const noticiaDoc = await noticiaRef.get();

        if (!noticiaDoc.exists) {
            showToast('Notícia não encontrada.', 'error');
            return false;
        }

        const noticia = noticiaDoc.data();

        if (noticia.autor.id === usuario.uid) {
            showToast('Você não pode votar na sua própria notícia.', 'error');
            return false;
        }

        // Verifica se já votou
        const votoExistente = noticia.votos?.usuarios?.[usuario.uid];
        if (votoExistente) {
            showToast('Você já votou nesta notícia.', 'error');
            return false;
        }

        const localizacaoUsuario = await obterLocalizacaoSilenciosa();
        const pesoVoto           = calcularPesoVoto(localizacaoUsuario, noticia);
        const incremento         = tipoVoto === 'positivo' ? pesoVoto : -pesoVoto;
        const campoVoto          = tipoVoto === 'positivo' ? 'votos.positivos' : 'votos.negativos';

        await noticiaRef.update({
            [campoVoto]: firebase.firestore.FieldValue.increment(incremento),
            [`votos.usuarios.${usuario.uid}`]: {
                tipo:      tipoVoto,
                peso:      pesoVoto,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        });

        await atualizarPontuacao(noticiaRef);
        showToast('Voto registrado com sucesso!', 'success');
        return true;

    } catch (error) {
        console.error('Erro ao votar:', error);
        showToast('Erro ao registrar voto.', 'error');
        return false;
    } finally {
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalHTML;
        }
    }
}

// ─── Report ───────────────────────────────────────────────────────────────────
export async function reportNews(noticiaId, motivo, usuario) {
    if (!usuario) {
        showToast('Faça login para reportar.', 'error');
        return false;
    }

    try {
        // Verifica se já reportou esta notícia
        const existingReport = await db.collection('reports')
            .where('noticiaId',  '==', noticiaId)
            .where('usuarioId',  '==', usuario.uid)
            .where('resolvido',  '==', false)
            .limit(1)
            .get();

        if (!existingReport.empty) {
            showToast('Você já reportou esta notícia.', 'error');
            return false;
        }

        const batch = db.batch();

        const reportRef = db.collection('reports').doc();
        batch.set(reportRef, {
            noticiaId:  noticiaId,
            usuarioId:  usuario.uid,
            motivo:     motivo,
            timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
            resolvido:  false
        });

        const noticiaRef = db.collection('noticias').doc(noticiaId);
        batch.update(noticiaRef, {
            pontuacao:    firebase.firestore.FieldValue.increment(-config.penalidadeReport),
            reportCount:  firebase.firestore.FieldValue.increment(1)
        });

        await batch.commit();

        // Verifica se atingiu limite de reports
        const noticiaDoc = await noticiaRef.get();
        if (noticiaDoc.exists && (noticiaDoc.data().reportCount || 0) >= config.limiteReports) {
            await noticiaRef.update({ status: 'removida' });
        }

        return true;
    } catch (error) {
        console.error('Erro ao reportar:', error);
        showToast('Erro ao enviar report.', 'error');
        return false;
    }
}

// ─── Verificar voto do usuário ────────────────────────────────────────────────
export async function checkUserVote(noticiaId, usuarioId) {
    try {
        const doc = await db.collection('noticias').doc(noticiaId).get();
        if (!doc.exists) return null;
        return doc.data().votos?.usuarios?.[usuarioId] || null;
    } catch (error) {
        console.error('Erro ao verificar voto:', error);
        return null;
    }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────
async function obterLocalizacaoSilenciosa() {
    try { return await obterLocalizacao(); }
    catch (_) { return null; }
}

function calcularPesoVoto(localizacaoUsuario, noticia) {
    if (localizacaoUsuario && noticia.localizacaoCoords) {
        const dist = calcularDistancia(localizacaoUsuario, noticia.localizacaoCoords);
        if (dist !== null && dist < 50) return config.pesoLocalizacao;
    }
    return config.pesoBase;
}

function calcularDistancia(loc1, loc2) {
    if (!loc1 || !loc2) return null;
    const R = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lon - loc1.lon) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function atualizarPontuacao(noticiaRef) {
    try {
        const snap = await noticiaRef.get();
        if (!snap.exists) return;

        const data       = snap.data();
        const positivos  = data.votos?.positivos || 0;
        const negativos  = data.votos?.negativos || 0;
        let pontuacao    = positivos - negativos;

        if (data.autor?.reputacao) pontuacao += data.autor.reputacao * 0.1;

        let status = 'averiguar';
        if (pontuacao >= config.pontosParaVerificar) status = 'verificada';
        else if (pontuacao <= config.pontosParaRemover) status = 'removida';

        await noticiaRef.update({ pontuacao, status });
    } catch (err) {
        console.error('Erro ao atualizar pontuação:', err);
    }
}
