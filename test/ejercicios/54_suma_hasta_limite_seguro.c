#include <stdio.h>
int main(void) {
    int N, I, S = 0;
    scanf("%d", &N);
    if (N < 0 || N > 65535) return 0;
    for (I = 1; I <= N; I++) S += I;
    printf("Suma: %d\n", S);
    return 0;
}
