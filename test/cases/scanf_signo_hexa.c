#include <stdio.h>
int main() {
    int N = -1, C, R;
    R = scanf("%d", &N);
    C = getchar();
    printf("%d %d %d\n", R, N, C);
    float F = -1;
    R = scanf("%f", &F);
    printf("%d %.1f\n", R, F);
    float G = -1;
    R = scanf("%f", &G);
    printf("%d %.2f\n", R, G);
    printf("%#.0e|%#.0f|%.0e\n", 99.995, 3.0, 99.995);
}
