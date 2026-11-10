#include <stdio.h>
int main(void) {
    int M[2][3], F, C;
    for (F = 0; F < 2; F++)
        for (C = 0; C < 3; C++) scanf("%d", &M[F][C]);
    for (C = 0; C < 3; C++) {
        for (F = 0; F < 2; F++) printf("%d ", M[F][C]);
        printf("\n");
    }
    return 0;
}
