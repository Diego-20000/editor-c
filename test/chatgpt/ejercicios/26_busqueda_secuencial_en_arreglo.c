#include <stdio.h>

int main(void) {
    int DATOS[10], N, I, OBJETIVO, POSICION = -1;

    scanf("%d", &N);
    if (N < 1 || N > 10) {
        printf("Cantidad invalida\n");
        return 0;
    }
    for (I = 0; I < N; I++) {
        scanf("%d", &DATOS[I]);
    }
    scanf("%d", &OBJETIVO);

    I = 0;
    while (I < N && POSICION == -1) {
        if (DATOS[I] == OBJETIVO) POSICION = I + 1;
        I++;
    }

    if (POSICION == -1) printf("No encontrado\n");
    else printf("Posicion: %d\n", POSICION);
    return 0;
}
