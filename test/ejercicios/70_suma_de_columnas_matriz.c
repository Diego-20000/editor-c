#include <stdio.h>
int main(void) {
    int M[2][3], S[3] = {0, 0, 0}, F, C;
    for (F = 0; F < 2; F++)
        for (C = 0; C < 3; C++) { scanf("%d", &M[F][C]); S[C] += M[F][C]; }
    for (C = 0; C < 3; C++) printf("Columna %d: %d\n", C + 1, S[C]);
    return 0;
}
