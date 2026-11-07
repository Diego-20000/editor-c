#include <stdio.h>
int main() {
    int v[3] = {1,2,3};
    int w[3];
    w = v;
    printf("%d\n", w[0]);
    return 0;
}
